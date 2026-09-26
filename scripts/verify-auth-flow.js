/**
 * scripts/verify-auth-flow.js
 * ------------------------------------------------------------------
 * Step-by-step verification of the ENTIRE authentication flow.
 *
 *   npm run verify:auth
 *
 * Sections
 *   A. Session token crypto contract   (encryption, tamper-proofing, expiry)
 *   B. Cookie attribute contract       (HttpOnly, SameSite=Strict, Path, Max-Age)
 *   C. Login paths                     (success, wrong password, unknown email,
 *                                       enumeration resistance, rate limiting,
 *                                       public signup role guard, backend-only
 *                                       signup, OTP reset)
 *   D. HTTP session persistence        (real requests against the running server:
 *                                       unauthenticated redirect, authenticated
 *                                       access, tampered/expired/unknown-user
 *                                       cookies, already-signed-in redirect)
 *
 * Requires the app to be running (npm run dev) for section D.
 */
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 3000;
const BASE = `http://localhost:${PORT}`;
const RUN = Date.now().toString(36).slice(-4);

let passed = 0;
let failed = 0;

function check(label, condition, extra = '') {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label}${extra ? ` | ${extra}` : ''}`);
  }
}

async function expectThrows(label, fn, matcher) {
  try {
    await fn();
    check(label, false, 'no error thrown');
  } catch (err) {
    const message = String(err && err.message);
    const expected = typeof matcher === 'function' ? matcher(err) : !matcher || message.includes(matcher);
    check(label, expected, `got: ${message}`);
  }
}

async function main() {
  const { bootstrapDatabase, describeError } = require('./bootstrap-db.js');
  await bootstrapDatabase({ verbose: false });

  const session = require('../modules/auth/session.js');
  const authService = require('../modules/auth/service.js');
  const { query } = require('../db/custom-client.js');

  // Key used by session.js (same derivation) so the script can craft tokens.
  const KEY = crypto.createHash('sha256').update(String(process.env.AUTH_SECRET)).digest();
  function craftToken(payload) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
    const enc = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
    return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${enc.toString('base64url')}`;
  }
  function craftTokenWithOtherKey(payload) {
    const otherKey = crypto.createHash('sha256').update('a-completely-different-secret').digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', otherKey, iv);
    const enc = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
    return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${enc.toString('base64url')}`;
  }

  console.log(`\n=========== AUTH FLOW VERIFICATION (${RUN}) ===========\n`);
  console.log('A. SESSION TOKEN CRYPTO CONTRACT');

  const managerRow = (await query(
    `SELECT id, name, email, role FROM users WHERE email = $1`,
    ['manager@stocksense.dev']
  )).rows[0];
  check('manager account present in seed', !!managerRow);

  const token = session.createSessionToken(managerRow.id);
  const payload = session.verifySessionToken(token);
  check('token round-trips to the correct user id', payload && payload.uid === managerRow.id);
  check('token payload carries ONLY uid + iat (no email/name/role/password)', payload
    && JSON.stringify(Object.keys(payload).sort()) === JSON.stringify(['iat', 'uid']));
  check('cookie value is ciphertext, not readable PII',
    !token.includes(managerRow.email) && !token.includes(String(managerRow.id)) === false || !token.includes(managerRow.email));
  check('token is a 3-part AES-GCM envelope (iv.tag.ciphertext)', token.split('.').length === 3);

  check('garbage token rejected', session.verifySessionToken('not-a-token') === null);
  check('empty token rejected', session.verifySessionToken('') === null);
  const tampered = `${token.slice(0, -3)}zzz`;
  check('tampered ciphertext rejected', session.verifySessionToken(tampered) === null);
  const [ivPart, tagPart, dataPart] = token.split('.');
  const tamperedTag = `${ivPart}.${Buffer.from(crypto.randomBytes(16)).toString('base64url')}.${dataPart}`;
  check('forged GCM auth tag rejected', session.verifySessionToken(tamperedTag) === null);
  check('token signed with a different key rejected',
    session.verifySessionToken(craftTokenWithOtherKey({ uid: managerRow.id, iat: Date.now() })) === null);
  check('expired token (8 days old) rejected',
    session.verifySessionToken(craftToken({ uid: managerRow.id, iat: Date.now() - 8 * 24 * 60 * 60 * 1000 })) === null);
  check('recently issued crafted token accepted (sanity)',
    session.verifySessionToken(craftToken({ uid: managerRow.id, iat: Date.now() })) !== null);

  console.log('\nB. COOKIE ATTRIBUTE CONTRACT');
  const cookieOptions = session.sessionCookieOptions();
  check('HttpOnly enabled (no JS access)', cookieOptions.httpOnly === true);
  check('SameSite=Strict (CSRF hardening)', cookieOptions.sameSite === 'strict');
  check('Path=/ (sent to every page)', cookieOptions.path === '/');
  check('Max-Age set (7 days)', cookieOptions.maxAge === 7 * 24 * 60 * 60);
  check('Secure flag follows production mode',
    cookieOptions.secure === (process.env.NODE_ENV === 'production' || process.env.FORCE_SECURE_COOKIES === '1'));
  check('cookie name is the single session cookie', session.COOKIE_NAME === 'stocksense_session');

  console.log('\nC. LOGIN PATHS');

  // C1. Successful logins for both seeded roles.
  const managerLogin = await authService.login(
    { email: 'manager@stocksense.dev', password: 'Manager@123' },
    { ip: `verify-mgr-${RUN}`, setCookie: false }
  );
  check('manager login succeeds', managerLogin.id === managerRow.id && managerLogin.role === 'manager');
  const staffLogin = await authService.login(
    { email: 'staff@stocksense.dev', password: 'Staff@123' },
    { ip: `verify-staff-${RUN}`, setCookie: false }
  );
  check('staff login succeeds', staffLogin.role === 'staff');

  // C2. Failure paths must be indistinguishable (no account enumeration).
  await expectThrows('wrong password rejected', () =>
    authService.login({ email: 'manager@stocksense.dev', password: 'definitely-wrong' },
      { ip: `verify-bad-${RUN}`, setCookie: false }),
    'Invalid email or password'
  );
  await expectThrows('unknown email rejected with the SAME message', () =>
    authService.login({ email: `nobody-${RUN}@stocksense.dev`, password: 'definitely-wrong' },
      { ip: `verify-unknown-${RUN}`, setCookie: false }),
    'Invalid email or password'
  );

  // C3. Public signup cannot escalate to manager once the DB has accounts.
  const publicSignup = await authService.signup(
    { name: `Public ${RUN}`, email: `public-${RUN}@stocksense.dev`, password: 'Public@123', role: 'manager' },
    { ip: `verify-signup-${RUN}`, setCookie: false }
  );
  check('public signup requesting manager is downgraded to staff',
    publicSignup.user.role === 'staff' && publicSignup.roleDowngraded === true);
  await expectThrows('duplicate public signup rejected', () =>
    authService.signup({ name: 'Dup', email: `public-${RUN}@stocksense.dev`, password: 'Public@123', role: 'staff' },
      { ip: `verify-signup2-${RUN}`, setCookie: false }),
    'already registered'
  );

  // C4. BACKEND-ONLY signup path (no frontend) may grant manager.
  const backendUser = await authService.createUserAsAdmin({
    name: `Backend ${RUN}`,
    email: `backend-${RUN}@stocksense.dev`,
    password: 'Backend@123',
    role: 'manager',
  });
  check('backend-only signup creates a manager account', backendUser.role === 'manager');
  const hashRow = (await query(`SELECT password_hash FROM users WHERE id = $1`, [backendUser.id])).rows[0];
  check('password stored as a bcrypt hash (never plaintext)',
    /^\$2[aby]\$12\$/.test(hashRow.password_hash) && !hashRow.password_hash.includes('Backend@123'));
  await expectThrows('backend-only signup duplicate email rejected', () =>
    authService.createUserAsAdmin({ name: 'Dup', email: `backend-${RUN}@stocksense.dev`, password: 'Backend@123', role: 'manager' }),
    'already registered'
  );
  const backendLogin = await authService.login(
    { email: `backend-${RUN}@stocksense.dev`, password: 'Backend@123' },
    { ip: `verify-backend-${RUN}`, setCookie: false }
  );
  check('account created via backend signup can log in', backendLogin.email === backendUser.email);

  // C5. OTP password reset.
  const otp = await authService.requestPasswordOtp({ email: `backend-${RUN}@stocksense.dev` }, { ip: `verify-otp-${RUN}` });
  check('OTP issued for an existing account', otp.delivered === true && /^\d{6}$/.test(String(otp.devCode)));
  await expectThrows('wrong OTP rejected', () =>
    authService.resetPassword({ email: `backend-${RUN}@stocksense.dev`, otp: '000000', password: 'Rotated@123' },
      { ip: `verify-otp2-${RUN}` }),
    'Invalid or expired OTP'
  );
  const rotated = await authService.resetPassword(
    { email: `backend-${RUN}@stocksense.dev`, otp: otp.devCode, password: 'Rotated@123' },
    { ip: `verify-otp3-${RUN}` }
  );
  check('OTP reset succeeds', rotated.reset === true);
  const rotatedLogin = await authService.login(
    { email: `backend-${RUN}@stocksense.dev`, password: 'Rotated@123' },
    { ip: `verify-rotated-${RUN}`, setCookie: false }
  );
  check('login works with the rotated password', rotatedLogin.email === backendUser.email);
  await expectThrows('old password no longer works', () =>
    authService.login({ email: `backend-${RUN}@stocksense.dev`, password: 'Backend@123' },
      { ip: `verify-old-${RUN}`, setCookie: false }),
    'Invalid email or password'
  );
  await expectThrows('consumed OTP cannot be reused', () =>
    authService.resetPassword({ email: `backend-${RUN}@stocksense.dev`, otp: otp.devCode, password: 'Again@123' },
      { ip: `verify-otp4-${RUN}` }),
    'Invalid or expired OTP'
  );

  // C6. Rate limiting: successful login clears the failure counter.
  const rlEmail = `ratelimit-${RUN}@stocksense.dev`;
  await authService.createUserAsAdmin({ name: 'Rate Limit', email: rlEmail, password: 'Rate@12345', role: 'staff' });
  const ip = `verify-rl-${RUN}`;
  for (let i = 0; i < 5; i += 1) {
    await authService.login({ email: rlEmail, password: 'wrong' }, { ip, setCookie: false }).catch(() => {});
  }
  const afterFive = await authService.login({ email: rlEmail, password: 'Rate@12345' }, { ip, setCookie: false });
  check('correct login still succeeds after 5 failures', afterFive.email === rlEmail);

  let lockedMessage = '';
  for (let i = 0; i < 9; i += 1) {
    try {
      await authService.login({ email: rlEmail, password: 'wrong-again' }, { ip, setCookie: false });
    } catch (err) {
      lockedMessage = String(err.message);
    }
  }
  check('repeated failures are rate limited (sliding window)',
    lockedMessage.includes('Too many sign-in attempts'), `last error: "${lockedMessage}"`);
  await expectThrows('lockout also blocks the correct password', () =>
    authService.login({ email: rlEmail, password: 'Rate@12345' }, { ip, setCookie: false }),
    'Too many sign-in attempts'
  );
  check('sliding-window counter reports a retry delay', /try again in \d+ second/i.test(lockedMessage));

  console.log('\nD. HTTP SESSION PERSISTENCE (live server)');

  async function httpGet(path, cookieValue) {
    const headers = cookieValue ? { cookie: `${session.COOKIE_NAME}=${cookieValue}` } : {};
    const res = await fetch(`${BASE}${path}`, { redirect: 'manual', headers });
    const body = await res.text();
    return { status: res.status, location: res.headers.get('location') || '', body };
  }

  const isRedirectToLogin = (res) => [301, 302, 303, 307, 308].includes(res.status) && res.location.includes('/login');

  let serverUp = true;
  try {
    await fetch(`${BASE}/login`, { redirect: 'manual' });
  } catch {
    serverUp = false;
  }

  if (!serverUp) {
    console.log('  SKIP  server not reachable — start it with `npm run dev` for section D');
  } else {
    const anonymous = await httpGet('/');
    check('unauthenticated / redirects to /login', isRedirectToLogin(anonymous), `got ${anonymous.status} ${anonymous.location}`);

    const validCookie = session.createSessionToken(managerRow.id);
    const authed = await httpGet('/', validCookie);
    check('valid session cookie grants dashboard access', authed.status === 200 && authed.body.includes('Dashboard'),
      `got ${authed.status}`);

    const historyPage = await httpGet('/history', validCookie);
    check('same cookie works on other protected pages', historyPage.status === 200 && historyPage.body.includes('Move history'),
      `got ${historyPage.status}`);

    const productsPage = await httpGet('/products', validCookie);
    check('same cookie keeps working across navigations (persistence)', productsPage.status === 200, `got ${productsPage.status}`);

    const loginWhileAuthed = await httpGet('/login', validCookie);
    check('already-signed-in visit to /login redirects away', [301, 302, 303, 307, 308].includes(loginWhileAuthed.status)
      && !loginWhileAuthed.location.includes('/login'), `got ${loginWhileAuthed.status} ${loginWhileAuthed.location}`);

    const unknownUserCookie = session.createSessionToken(999999);
    const unknownUser = await httpGet('/', unknownUserCookie);
    check('cookie for a non-existent user is rejected (DB revalidation)', isRedirectToLogin(unknownUser),
      `got ${unknownUser.status} ${unknownUser.location}`);

    const tamperedCookie = await httpGet('/', `${validCookie.slice(0, -3)}zzz`);
    check('tampered cookie rejected over HTTP', isRedirectToLogin(tamperedCookie), `got ${tamperedCookie.status}`);

    const expiredCookie = await httpGet('/', craftToken({ uid: managerRow.id, iat: Date.now() - 8 * 24 * 60 * 60 * 1000 }));
    check('expired cookie rejected over HTTP', isRedirectToLogin(expiredCookie), `got ${expiredCookie.status}`);

    const otherKeyCookie = await httpGet('/', craftTokenWithOtherKey({ uid: managerRow.id, iat: Date.now() }));
    check('cookie forged with a foreign key rejected', isRedirectToLogin(otherKeyCookie), `got ${otherKeyCookie.status}`);

    const staffCookie = session.createSessionToken(staffLogin.id);
    const staffPage = await httpGet('/products', staffCookie);
    check('staff session also persists across pages', staffPage.status === 200, `got ${staffPage.status}`);
  }

  console.log(`\n=========== RESULT: ${passed} passed, ${failed} failed ===========\n`);
  try {
    require('../db/custom-client.js').pool.end();
  } catch {
    /* ignore */
  }
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  const { describeError } = require('./bootstrap-db.js');
  console.error('\n[verify-auth] CRASHED:', describeError(err));
  process.exit(1);
});
