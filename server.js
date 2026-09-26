/**
 * server.js
 * ------------------------------------------------------------------
 * StockSense monolith entry point.
 * 1. Bootstraps PostgreSQL (embedded or external) — zero cloud services.
 * 2. Starts the Next.js server (Server Actions = zero REST APIs).
 *
 *   npm run dev  ->  http://localhost:3000
 */
const http = require('http');
const next = require('next');
const { bootstrapDatabase } = require('./scripts/bootstrap-db.js');

/**
 * Resolve the listening port defensively: some shells export PORT=0,
 * blank or non-numeric values. Port 0 would silently bind a RANDOM
 * free port, so anything invalid falls back to 3000.
 */
function resolvePort() {
  const parsed = Number.parseInt(process.env.PORT ?? '', 10);
  if (Number.isInteger(parsed) && parsed > 0 && parsed <= 65535) return parsed;
  return 3000;
}

const PORT = resolvePort();
const dev = process.env.NODE_ENV !== 'production';

async function main() {
  // 1. Database must be live before Next serves any action.
  await bootstrapDatabase();

  // 2. Start the Next.js monolith.
  const app = next({ dev, hostname: '0.0.0.0', port: PORT });
  const handle = app.getRequestHandler();
  await app.prepare();

  const server = http.createServer((req, res) => handle(req, res));
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  StockSense IMS ready → http://localhost:${PORT}\n`);
  });

  const shutdown = () => {
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  const { describeError } = require('./scripts/bootstrap-db.js');
  console.error('[server] fatal:', describeError(err));
  process.exit(1);
});
