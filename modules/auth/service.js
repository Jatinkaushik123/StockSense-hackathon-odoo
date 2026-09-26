/**
 * modules/auth/service.js
 * ------------------------------------------------------------------
 * Authentication & account lifecycle.
 *  - bcrypt password hashing (salt rounds 12 >= 10 mandated minimum)
 *  - sliding-window rate limiting on login / OTP / reset
 *  - OTP password reset stored in users.otp_code + users.otp_expiry
 *  - encrypted HttpOnly session cookie creation (see ./session.js)
 *
 * Security notes:
 *  - Login always compares against a bcrypt hash (dummy hash for unknown
 *    emails) so response timing does not reveal account existence.
 *  - Generic error messages ("Invalid email or password") prevent
 *    account enumeration.
 *  - Public signup can only create a 'staff' account; the very first
 *    account in an empty database bootstraps as manager.
 */
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { query } = require('../../db/custom-client.js');
const { AppError } = require('../security/errorHandler.js');
const { setSessionCookie, clearSessionCookie } = require('./session.js');
const limiter = require('./rateLimiter.js');

const BCRYPT_ROUNDS = 12;
const OTP_TTL_MINUTES = 10;
const DUMMY_HASH = bcrypt.hashSync('stocksense-timing-equalizer', BCRYPT_ROUNDS);

const OTP_SHOWN_IN_UI =
  process.env.SHOW_OTP_IN_UI !== '0' && process.env.NODE_ENV !== 'production';

function enforce(key, limit, windowMs, label) {
  const gate = limiter.consume(key, limit, windowMs);
  if (!gate.allowed) {
    throw new AppError(
      `Too many ${label} attempts. Please try again in ${gate.retryAfterSec} second(s).`,
      429
    );
  }
}

/** Create an account (public signup). Only the first user may be manager. */
async function signup({ name, email, password, role }, { ip = 'unknown', setCookie = true } = {}) {
  enforce(`signup:${ip}`, 10, 15 * 60 * 1000, 'signup');

  const { rows: countRows } = await query(`SELECT COUNT(*)::int AS count FROM users`);
  const isFirstUser = countRows[0].count === 0;
  const effectiveRole = isFirstUser ? role : 'staff';

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  let user;
  try {
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
      [name, email, passwordHash, effectiveRole]
    );
    user = rows[0];
  } catch (err) {
    if (err.code === '23505') throw new AppError('This email is already registered.', 409);
    throw err;
  }

  if (setCookie) await setSessionCookie(user.id);
  return { user, roleDowngraded: !isFirstUser && role !== 'staff' };
}

/** Verify credentials and open a session. */
async function login({ email, password }, { ip = 'unknown', setCookie = true } = {}) {
  enforce(`login:ip:${ip}`, 30, 15 * 60 * 1000, 'sign-in');
  enforce(`login:email:${email}`, 8, 15 * 60 * 1000, 'sign-in');

  const { rows } = await query(
    `SELECT id, name, email, role, password_hash FROM users WHERE email = $1`,
    [email]
  );
  const user = rows[0];

  // Constant-work comparison: unknown emails still burn a bcrypt compare.
  const matches = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !matches) {
    throw new AppError('Invalid email or password.', 401);
  }

  limiter.reset(`login:email:${email}`);
  if (setCookie) await setSessionCookie(user.id);
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

/**
 * BACKEND-ONLY account provisioning (no UI, no REST endpoint).
 * Unlike public signup it may grant the manager role, because it is an
 * administrative path reachable only from trusted server-side code
 * (scripts/create-user.js) and never from the browser.
 */
async function createUserAsAdmin({ name, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  try {
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at`,
      [name, email, passwordHash, role]
    );
    return rows[0];
  } catch (err) {
    if (err.code === '23505') throw new AppError('This email is already registered.', 409);
    throw err;
  }
}

/** BACKEND-ONLY account listing (id, name, email, role — never hashes). */
async function listUsers() {
  const { rows } = await query(
    `SELECT id, name, email, role, created_at FROM users ORDER BY id`
  );
  return rows;
}

function generateOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

/**
 * Generate an OTP for password reset. The response never reveals whether
 * the email exists. In non-production the code is returned so the demo
 * works without an email provider (zero external services mandate);
 * set SHOW_OTP_IN_UI=0 to disable.
 */
async function requestPasswordOtp({ email }, { ip = 'unknown' } = {}) {
  enforce(`otp:ip:${ip}`, 6, 60 * 60 * 1000, 'OTP request');
  enforce(`otp:email:${email}`, 3, 10 * 60 * 1000, 'OTP request');

  const otp = generateOtp();
  const { rows } = await query(
    `UPDATE users
        SET otp_code = $2,
            otp_expiry = (CURRENT_TIMESTAMP AT TIME ZONE 'UTC') + ($3 || ' minutes')::interval
      WHERE email = $1
      RETURNING id`,
    [email, otp, String(OTP_TTL_MINUTES)]
  );

  const delivered = rows.length > 0;
  return {
    delivered,
    devCode: delivered && OTP_SHOWN_IN_UI ? otp : null,
    ttlMinutes: OTP_TTL_MINUTES,
  };
}

/**
 * Complete a password reset. The OTP check + expiry check + update all
 * happen in ONE atomic statement, so a code can never be consumed twice.
 */
async function resetPassword({ email, otp, password }, { ip = 'unknown' } = {}) {
  enforce(`reset:ip:${ip}`, 10, 15 * 60 * 1000, 'password reset');

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const { rows } = await query(
    `UPDATE users
        SET password_hash = $3,
            otp_code = NULL,
            otp_expiry = NULL
      WHERE email = $1
        AND otp_code = $2
        AND otp_expiry IS NOT NULL
        AND otp_expiry > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
      RETURNING id, email`,
    [email, otp, passwordHash]
  );

  if (!rows[0]) {
    throw new AppError('Invalid or expired OTP code.', 400);
  }
  limiter.reset(`reset:ip:${ip}`);
  return { email: rows[0].email, reset: true };
}

async function logout() {
  await clearSessionCookie();
}

module.exports = {
  signup,
  login,
  logout,
  requestPasswordOtp,
  resetPassword,
  createUserAsAdmin,
  listUsers,
  BCRYPT_ROUNDS,
};
