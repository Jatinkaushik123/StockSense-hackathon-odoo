/**
 * db/custom-client.js
 * ------------------------------------------------------------------
 * Native `pg` (node-postgres) pool wrapper for StockSense IMS.
 * STRICTLY NO ORM / NO QUERY BUILDER — every query is hand-written,
 * parameterized SQL ($1, $2, ...). The runInTransaction helper wraps
 * async units of work in native BEGIN / COMMIT / ROLLBACK.
 */
const { Pool } = require('pg');
const { connectionUrl } = require('./config.js');

const pool = new Pool({
  connectionString: connectionUrl(),
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 8000,
});

pool.on('error', (err) => {
  console.error('[db] idle client error:', err.message);
});

/** Parameterized query against the pool. */
function query(text, params) {
  return pool.query(text, params);
}

/**
 * Transaction engine: checks out ONE dedicated client, runs BEGIN,
 * executes fn(client) and COMMITs; any thrown error triggers ROLLBACK
 * and the error propagates to the caller.
 */
async function runInTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rbErr) {
      console.error('[db] ROLLBACK failed:', rbErr.message);
    }
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, runInTransaction };
