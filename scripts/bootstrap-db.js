/**
 * scripts/bootstrap-db.js
 * ------------------------------------------------------------------
 * Zero-admin PostgreSQL bootstrap for StockSense.
 *
 *   1. If PostgreSQL is already reachable, reuse it (Docker/system PG).
 *   2. If the server is up but the database is missing, create it.
 *   3. Otherwise start the EMBEDDED PostgreSQL (real server binaries,
 *      no Docker, no cloud, no administrator rights).
 *   4. Apply db/schema.sql + db/seed.sql (both idempotent) and seed
 *      demo users with real bcrypt hashes.
 *
 * Restart-safe: cluster reuse is detected via the PG_VERSION marker
 * (never by sniffing initdb's error text), and stale postmaster.pid
 * files left behind by a hard kill are cleaned up automatically.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const {
  ROOT,
  PG_PORT,
  PG_USER,
  PG_PASSWORD,
  DB_NAME,
  connectionUrl,
  adminUrl,
  assertIdentifier,
} = require('../db/config.js');

const EMBEDDED_DIR = path.join(ROOT, 'data', 'pgdata');

let currentEmbedded = null; // live embedded instance (kept for graceful stop)

/**
 * Format ANY thrown value (including non-Error rejections that carry no
 * message) into a readable description — opaque "FAILED: undefined"
 * failures must never happen again.
 */
function describeError(err) {
  if (!err) return 'unknown error (falsy rejection value)';
  if (err instanceof Error) return err.stack || err.message || err.name || 'Error without message';
  if (typeof err === 'object') {
    try {
      const json = JSON.stringify(err);
      if (json && json !== '{}') return json;
    } catch {
      /* fall through to property listing */
    }
    const own = Object.getOwnPropertyNames(err);
    if (own.length) return `${err.constructor ? err.constructor.name : 'Object'} { ${own.join(', ')} }`;
  }
  return String(err);
}

async function tryConnect(url, timeout = 1500) {
  const client = new Client({ connectionString: url, connectionTimeoutMillis: timeout });
  try {
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    return true;
  } catch {
    try { await client.end(); } catch { /* ignore */ }
    return false;
  }
}

async function waitForPort(url, attempts = 20) {
  for (let i = 0; i < attempts; i += 1) {
    if (await tryConnect(url, 1000)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

/** Remove a stale postmaster.pid whose owning server is no longer alive. */
function clearStalePidFile() {
  const pidFile = path.join(EMBEDDED_DIR, 'postmaster.pid');
  if (!fs.existsSync(pidFile)) return false;
  try {
    const first = String(fs.readFileSync(pidFile, 'utf8')).split(/\r?\n/)[0].trim();
    const pid = Number(first);
    let alive = false;
    if (Number.isInteger(pid) && pid > 0) {
      try {
        process.kill(pid, 0);
        alive = true;
      } catch {
        alive = false;
      }
    }
    if (!alive) {
      fs.rmSync(pidFile, { force: true });
      console.log('[bootstrap] Cleared stale postmaster.pid from a previous hard shutdown.');
      return true;
    }
  } catch (err) {
    console.warn('[bootstrap] Could not inspect postmaster.pid:', err.message);
  }
  return false;
}

async function ensureDatabase(url, dbName) {
  // DDL cannot use bind parameters, so the name is whitelist-validated first.
  const safeName = assertIdentifier(dbName, 'database name');
  const admin = new Client({ connectionString: url, connectionTimeoutMillis: 5000 });
  await admin.connect();
  try {
    // Existence check IS parameterized (no interpolation involved).
    const { rows } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [safeName]);
    if (!rows.length) {
      await admin.query(`CREATE DATABASE ${safeName}`);
      console.log(`[bootstrap] Created database "${safeName}".`);
    }
  } finally {
    await admin.end();
  }
}

async function startEmbedded() {
  const mod = await import('embedded-postgres'); // ESM package -> dynamic import
  const EmbeddedPostgres = mod.default || mod;

  const options = {
    databaseDir: EMBEDDED_DIR,
    user: PG_USER,
    password: PG_PASSWORD,
    port: PG_PORT,
    persistent: true,
    onLog: () => {},
    onError: () => {},
  };

  fs.mkdirSync(EMBEDDED_DIR, { recursive: true });

  const pg = new EmbeddedPostgres(options);
  const marker = path.join(EMBEDDED_DIR, 'PG_VERSION');
  const alreadyInitialised = fs.existsSync(marker);

  if (!alreadyInitialised) {
    await pg.initialise();
    console.log('[bootstrap] Embedded PostgreSQL cluster initialised (initdb).');
  } else {
    console.log('[bootstrap] Embedded cluster detected on disk (PG_VERSION) — skipping initdb.');
  }

  clearStalePidFile();

  await pg.start();

  // Readiness must probe the ADMIN database ("postgres"), which always
  // exists. Probing the application database would fail forever on a
  // first run, because that database is created only after this point.
  let ready = await waitForPort(adminUrl(), 20);
  if (!ready) {
    // Only retry the start when the server is genuinely down — starting an
    // already-running server throws an error without a message and hides
    // the real problem.
    clearStalePidFile();
    if (!(await tryConnect(adminUrl(), 1000))) {
      await pg.start();
      ready = await waitForPort(adminUrl(), 20);
    }
  }
  if (!ready) {
    throw new Error(`Embedded PostgreSQL started but port ${PG_PORT} never became reachable.`);
  }
  console.log(`[bootstrap] Embedded PostgreSQL listening on port ${PG_PORT}.`);

  currentEmbedded = pg;
  return pg;
}

/** Apply schema.sql + seed.sql + bcrypt demo users. Returns a summary. */
async function applySql() {
  const client = new Client({ connectionString: connectionUrl(), connectionTimeoutMillis: 8000 });
  await client.connect();
  try {
    const schemaSql = fs.readFileSync(path.join(ROOT, 'db', 'schema.sql'), 'utf8');
    const seedSql = fs.readFileSync(path.join(ROOT, 'db', 'seed.sql'), 'utf8');
    await client.query(schemaSql);
    await client.query(seedSql);

    const { seedUsers } = require('./seed-users.js');
    const createdUsers = await seedUsers(client);

    const { rows } = await client.query(
      `SELECT
         (SELECT COUNT(*)::int FROM products)     AS products,
         (SELECT COUNT(*)::int FROM locations)    AS locations,
         (SELECT COUNT(*)::int FROM users)        AS users,
         (SELECT COUNT(*)::int FROM stock_quants) AS quants`
    );
    return { createdUsers, counts: rows[0] };
  } finally {
    await client.end();
  }
}

/** Full bootstrap used by server.js and scripts/setup-db.js. Idempotent. */
async function bootstrapDatabase({ verbose = true } = {}) {
  const url = connectionUrl();
  const admin = adminUrl();

  if (await tryConnect(url)) {
    if (verbose) console.log('[bootstrap] Database reachable — reusing running instance.');
  } else if (await tryConnect(admin)) {
    if (verbose) console.log('[bootstrap] PostgreSQL server reachable — creating missing database.');
    await ensureDatabase(admin, DB_NAME);
  } else {
    if (verbose) console.log('[bootstrap] No reachable PostgreSQL — starting embedded instance...');
    await startEmbedded();
    await ensureDatabase(admin, DB_NAME);
  }

  const summary = await applySql();
  if (verbose) {
    console.log(
      `[bootstrap] Schema applied. products=${summary.counts.products} locations=${summary.counts.locations} ` +
      `users=${summary.counts.users} stock_quants=${summary.counts.quants}` +
      (summary.createdUsers.length ? ` (created: ${summary.createdUsers.map((u) => u.email).join(', ')})` : '')
    );
  }
  return { embedded: currentEmbedded, summary, url };
}

/** Gracefully stop the embedded server (used on process shutdown). */
async function stopEmbedded() {
  if (!currentEmbedded) return;
  try {
    await currentEmbedded.stop();
    currentEmbedded = null;
    console.log('[bootstrap] Embedded PostgreSQL stopped gracefully.');
  } catch (err) {
    console.warn('[bootstrap] Embedded stop failed:', err && err.message);
  }
}

module.exports = { bootstrapDatabase, stopEmbedded, connectionUrl, describeError };

if (require.main === module) {
  bootstrapDatabase()
    .then(() => {
      console.log('[setup-db] Database ready. (Embedded server stops when this process exits — use `npm run dev` to serve.)');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[setup-db] FAILED:', describeError(err));
      process.exit(1);
    });
}
