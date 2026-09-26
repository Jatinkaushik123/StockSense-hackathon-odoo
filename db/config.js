/**
 * db/config.js
 * ------------------------------------------------------------------
 * SINGLE SOURCE OF TRUTH for the PostgreSQL connection.
 * Both the app pool (db/custom-client.js) and the bootstrap script
 * (scripts/bootstrap-db.js) resolve their URLs from here, so the
 * superuser/port/database can never drift apart again.
 */
const fs = require('fs');
const path = require('path');

/**
 * Resolve the project root RELIABLY.
 *
 * `__dirname` is NOT stable: as soon as this module is bundled by Next.js it
 * resolves inside the .next build output (e.g. .next/server/...) instead of the
 * source tree. Anything derived from __dirname would then point at the build
 * artifact directory — which is exactly how the session key ended up in two
 * different files. A project root is therefore identified by its MARKERS
 * (package.json AND db/schema.sql) and searched upwards from both __dirname and
 * the working directory.
 */
function resolveProjectRoot() {
  const isProjectRoot = (dir) => {
    try {
      return (
        fs.existsSync(path.join(dir, 'package.json')) &&
        fs.existsSync(path.join(dir, 'db', 'schema.sql'))
      );
    } catch {
      return false;
    }
  };

  if (process.env.STOCKSENSE_ROOT && isProjectRoot(process.env.STOCKSENSE_ROOT)) {
    return process.env.STOCKSENSE_ROOT;
  }

  for (const start of [__dirname, process.cwd()]) {
    let dir = start;
    for (let depth = 0; depth < 10; depth += 1) {
      if (isProjectRoot(dir)) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }

  return process.cwd();
}

const ROOT = resolveProjectRoot();

function loadEnv() {
  try {
    const raw = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
    }
  } catch {
    /* .env is optional */
  }
}

loadEnv();

/**
 * PostgreSQL identifiers (database names) CANNOT be passed as bind parameters —
 * CREATE DATABASE / DROP DATABASE take a literal. Interpolating an unvalidated
 * name would therefore be an injection vector, so every identifier that is ever
 * embedded in DDL is validated against a strict whitelist pattern first.
 */
function assertIdentifier(value, label) {
  const name = String(value || '');
  if (!/^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(name)) {
    throw new Error(
      `Refusing to use unsafe SQL identifier for ${label}: ${JSON.stringify(value)}. ` +
      'Only letters, digits and underscores are allowed.'
    );
  }
  return name;
}

const PG_HOST = process.env.PG_HOST || 'localhost';
const PG_PORT = Number(process.env.PG_PORT || 5440);
const PG_USER = process.env.PG_USER || 'postgres';
const PG_PASSWORD = process.env.PG_PASSWORD || 'stocksense';
const DB_NAME = assertIdentifier(process.env.PG_DATABASE || 'stocksense', 'PG_DATABASE');

const DEFAULT_URL = `postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${DB_NAME}`;

/** Application connection string (DATABASE_URL wins when provided). */
function connectionUrl() {
  return process.env.DATABASE_URL || DEFAULT_URL;
}

/** Marker directory for runtime files (auth secret, embedded cluster, logs). */
function dataDir() {
  return path.join(ROOT, 'data');
}

/** Admin connection string pointing at the always-present "postgres" database. */
function adminUrl() {
  return connectionUrl().replace(/\/[^/?]+(\?.*)?$/, '/postgres$1');
}

module.exports = {
  ROOT,
  PG_HOST,
  PG_PORT,
  PG_USER,
  PG_PASSWORD,
  DB_NAME,
  connectionUrl,
  adminUrl,
  dataDir,
  resolveProjectRoot,
  assertIdentifier,
};
