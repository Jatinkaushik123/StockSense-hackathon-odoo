/**
 * scripts/setup-db.js
 * ------------------------------------------------------------------
 * CLI entry: node scripts/setup-db.js
 * Boots (or reuses) PostgreSQL, applies schema + seed, seeds users.
 */
const { bootstrapDatabase, describeError } = require('./bootstrap-db.js');

bootstrapDatabase()
  .then(() => {
    console.log('[setup-db] Database ready.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[setup-db] FAILED:', describeError(err));
    process.exit(1);
  });
