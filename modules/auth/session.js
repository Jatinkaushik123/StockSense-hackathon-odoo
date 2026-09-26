/**
 * modules/auth/session.js
 * ------------------------------------------------------------------
 * Encrypted session-token engine (AES-256-GCM) + HttpOnly cookie handling.
 * - Tokens are opaque envelopes: base64url(iv).base64url(tag).base64url(payload)
 * - Cookies are HttpOnly, SameSite=Strict, Secure (in HTTPS/production).
 * - Replay window: token payload carries an iat; tokens older than 7d die.
 */
const crypto = require('crypto');
const path = require('path');

loadEnv(path.join(__dirname, '..', '..', '.env'));

function loadEnv(file) {
  try {
    const raw = require('fs').readFileSync(file, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  } catch {
    /* optional */
  }
}

// Stable key derivation — fresh keys would invalidate sessions on restart.
//
// The secret file location is derived from the PROJECT ROOT (resolved by
// db/config.js via marker files), never from __dirname: when this module is
// bundled by Next.js, __dirname points inside .next/, which previously created
// a SECOND secret file there and made the web server and the CLI scripts mint
// mutually invalid tokens (and lose every session whenever .next was cleared).
const { ROOT } = require('../../db/config.js');
const SECRET_FILE = path.join(ROOT, 'data', '.auth-secret');

let SECRET = process.env.AUTH_SECRET || '';
if (!SECRET) {
  try {
    SECRET = require('fs').readFileSync(SECRET_FILE, 'utf8').trim();
  } catch {
    SECRET = crypto.randomBytes(32).toString('hex');
    require('fs').mkdirSync(path.dirname(SECRET_FILE), { recursive: true });
    require('fs').writeFileSync(SECRET_FILE, SECRET, { mode: 0o600 });
    console.warn(
      `[auth] No AUTH_SECRET found — generated a new session key at ${SECRET_FILE}. ` +
      'Existing sessions (and any token issued before this key) are invalidated.'
    );
  }
  process.env.AUTH_SECRET = SECRET;
}

const KEY = crypto.createHash('sha256').update(SECRET).digest(); // 32B key
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const COOKIE_NAME = 'stocksense_session';

const { pool, query } = require('../../db/custom-client.js');

function encrypt(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${enc.toString('base64url')}`;
}

function decrypt(envelope) {
  const [ivB64, tagB64, dataB64] = String(envelope).split('.');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('MALFORMED_TOKEN');
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(ivB64, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64url')), decipher.final()]).toString('utf8');
}

function createSessionToken(userId) {
  const payload = JSON.stringify({ uid: userId, iat: Date.now() });
  return encrypt(payload);
}

function verifySessionToken(token) {
  try {
    const payload = JSON.parse(decrypt(token));
    if (!payload || typeof payload.uid !== 'number') return null;
    if (Date.now() - payload.iat > SESSION_TTL_MS) return null; // replay window
    return payload;
  } catch {
    return null; // tampered / wrong key / malformed
  }
}

function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production' || process.env.FORCE_SECURE_COOKIES === '1',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  };
}

// Internal alias kept for readability inside this module.
const cookieOptions = sessionCookieOptions;

/** Next.js Server Action helper — sets the encrypted session cookie. */
async function setSessionCookie(userId) {
  const { cookies } = await import('next/headers');
  const store = await cookies();
  store.set(COOKIE_NAME, createSessionToken(userId), cookieOptions());
}

/** Next.js Server Action helper — clears the session cookie. */
async function clearSessionCookie() {
  const { cookies } = await import('next/headers');
  const store = await cookies();
  store.set(COOKIE_NAME, '', { ...cookieOptions(), maxAge: 0 });
}

/**
 * Reads the session cookie, decrypts it and re-validates the user
 * against the database (role changes / user deletion take effect
 * immediately — the token alone never grants authority).
 * @returns {{id:number,name:string,email:string,role:'manager'|'staff'} | null}
 */
async function getSessionUser() {
  const { cookies } = await import('next/headers');
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = verifySessionToken(token);
  if (!payload) return null;

  const { rows } = await query(
    'SELECT id, name, email, role FROM users WHERE id = $1',
    [payload.uid]
  );
  return rows[0] || null;
}

module.exports = {
  COOKIE_NAME,
  SESSION_TTL_MS,
  createSessionToken,
  verifySessionToken,
  sessionCookieOptions,
  setSessionCookie,
  clearSessionCookie,
  getSessionUser,
  pool,
};
