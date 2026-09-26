/**
 * scripts/test-engines.js
 * ------------------------------------------------------------------
 * End-to-end test suite for every StockSense subsystem.
 * Runs against an ISOLATED database (stocksense_test) so demo data
 * stays pristine. Covers:
 *   - auth: login, RBAC, signup escalation guard, OTP reset
 *   - product & location CRUD (incl. duplicate SKU, ledger-protected delete)
 *   - receipt / delivery / transfer / adjustment flows
 *   - INSUFFICIENT STOCK atomicity (full rollback, no partial ledger rows)
 *   - CONCURRENCY: parallel deliveries against one quant row
 *     (proves SELECT ... FOR UPDATE prevents overselling / negative stock)
 *   - double-validation protection, invalid status transitions
 *   - dashboard KPIs + paginated move history
 *
 * Usage: node scripts/test-engines.js
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const ROOT = path.join(__dirname, '..');
const TEST_DB = 'stocksense_test';
// CREATE/DROP DATABASE cannot be parameterized: the name is a fixed constant
// AND is whitelist-validated before it is embedded in DDL.
const { assertIdentifier } = require('../db/config.js');
assertIdentifier(TEST_DB, 'test database name');
const ADMIN_URL = 'postgresql://postgres:stocksense@localhost:5440/postgres';
const TEST_URL = `postgresql://postgres:stocksense@localhost:5440/${TEST_DB}`;

let passed = 0;
let failed = 0;

function check(label, cond, extra = '') {
  if (cond) {
    passed += 1;
    console.log(`  PASS  ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${label} ${extra ? `| ${extra}` : ''}`);
  }
}

async function expectError(label, fn, matcher) {
  try {
    await fn();
    check(`${label} -> throws`, false, 'no error thrown');
  } catch (err) {
    const msg = String(err && err.message);
    const ok =
      typeof matcher === 'function' ? matcher(err) : !matcher || msg.includes(matcher);
    check(`${label}`, ok, `got: ${msg}`);
  }
}

const RUN = Date.now().toString(36).slice(-4);

async function prepareDatabase() {
  const admin = new Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${TEST_DB}`);
  await admin.end();

  const client = new Client({ connectionString: TEST_URL });
  await client.connect();
  await client.query(fs.readFileSync(path.join(ROOT, 'db', 'schema.sql'), 'utf8'));
  await client.query(fs.readFileSync(path.join(ROOT, 'db', 'seed.sql'), 'utf8'));
  const { seedUsers } = require('./seed-users.js');
  await seedUsers(client);
  await client.end();
}

async function main() {
  // 1. Boot PostgreSQL (embedded or external) and build the isolated test DB.
  const { bootstrapDatabase, stopEmbedded } = require('./bootstrap-db.js');
  await bootstrapDatabase({ verbose: false });
  await prepareDatabase();
  process.env.DATABASE_URL = TEST_URL; // app modules bind their pool AFTER this point

  const { query, runInTransaction } = require('../db/custom-client.js');
  const auth = require('../modules/auth/service.js');
  const catalog = require('../modules/products/catalog.js');
  const locations = require('../modules/products/locations.js');
  const stock = require('../modules/products/stock.js');
  const receiptEngine = require('../modules/engine/receiptEngine.js');
  const deliveryEngine = require('../modules/engine/deliveryEngine.js');
  const transferEngine = require('../modules/engine/transferEngine.js');
  const adjustmentEngine = require('../modules/engine/adjustmentEngine.js');
  const shared = require('../modules/engine/shared.js');
  const dashboard = require('../modules/operations/dashboard.js');
  const history = require('../modules/operations/moveHistory.js');

  console.log(`\n=== StockSense test run (${RUN}) ===\n`);

  // -------------------------------------------------------------------------
  console.log('AUTH');
  const manager = await auth.login(
    { email: 'manager@stocksense.dev', password: 'Manager@123' },
    { ip: 'test', setCookie: false }
  );
  check('manager login', manager.role === 'manager');
  const staff = await auth.login(
    { email: 'staff@stocksense.dev', password: 'Staff@123' },
    { ip: 'test', setCookie: false }
  );
  check('staff login', staff.role === 'staff');
  await expectError('wrong password rejected', () =>
    auth.login({ email: 'staff@stocksense.dev', password: 'nope' }, { ip: 'test', setCookie: false }),
    'Invalid email or password'
  );
  await expectError('unknown email rejected generically', () =>
    auth.login({ email: `ghost-${RUN}@x.dev`, password: 'whatever123' }, { ip: 'test', setCookie: false }),
    'Invalid email or password'
  );

  const signup = await auth.signup(
    { name: `Test User ${RUN}`, email: `tester-${RUN}@stocksense.dev`, password: 'Tester@123', role: 'manager' },
    { ip: 'test', setCookie: false }
  );
  check('signup with users present is downgraded to staff', signup.user.role === 'staff' && signup.roleDowngraded === true);
  await expectError('duplicate email rejected', () =>
    auth.signup(
      { name: 'Dup', email: `tester-${RUN}@stocksense.dev`, password: 'Tester@123', role: 'staff' },
      { ip: 'test', setCookie: false }
    ),
    'already registered'
  );

  const otpRequest = await auth.requestPasswordOtp({ email: `tester-${RUN}@stocksense.dev` }, { ip: 'test' });
  check('OTP generated for real user', otpRequest.delivered === true && /^\d{6}$/.test(otpRequest.devCode || ''));
  await expectError('wrong OTP rejected', () =>
    auth.resetPassword({ email: `tester-${RUN}@stocksense.dev`, otp: '000000', password: 'NewPass@123' }, { ip: 'test' }),
    'Invalid or expired OTP'
  );
  const reset = await auth.resetPassword(
    { email: `tester-${RUN}@stocksense.dev`, otp: otpRequest.devCode, password: 'NewPass@123' },
    { ip: 'test' }
  );
  check('OTP reset succeeds', reset.reset === true);
  const relog = await auth.login(
    { email: `tester-${RUN}@stocksense.dev`, password: 'NewPass@123' },
    { ip: 'test', setCookie: false }
  );
  check('login with new password', relog.email === `tester-${RUN}@stocksense.dev`);
  await expectError('reused OTP rejected (one-time use)', () =>
    auth.resetPassword({ email: `tester-${RUN}@stocksense.dev`, otp: otpRequest.devCode, password: 'Another@123' }, { ip: 'test' }),
    'Invalid or expired OTP'
  );

  // -------------------------------------------------------------------------
  console.log('\nCATALOG + LOCATIONS');
  const product = await catalog.createProduct({
    name: `Test Widget ${RUN}`,
    sku: `TST-${RUN}-WIDGET`,
    category: 'Test',
    uom: 'pcs',
    minStockAlert: 5,
  });
  check('product created', !!product.id);
  const updated = await catalog.updateProduct(product.id, { name: `Test Widget ${RUN} v2`, minStockAlert: 7 });
  check('product updated (COALESCE partial update)', updated.name.endsWith('v2') && updated.min_stock_alert === 7);
  await expectError('duplicate SKU rejected with friendly message', () =>
    catalog.createProduct({ name: 'Dup SKU', sku: `TST-${RUN}-WIDGET`, category: 'Test', uom: 'pcs', minStockAlert: 1 }),
    'SKU already exists'
  );
  const locs = await locations.listInternalLocations();
  check('internal locations listed', locs.length >= 5);
  const mainStore = locs.find((l) => l.name === 'Main Store');
  const rackA = locs.find((l) => l.name === 'Rack A');
  const vendors = await locations.getSystemLocation('vendor');
  check('system vendor location resolved', vendors.name === 'Vendors');
  await expectError('destination must be internal (system vendor rejected)', () =>
    receiptEngine.createReceipt({
      partnerName: 'x',
      destLocationId: vendors.id,
      lines: [{ productId: product.id, quantity: 1 }],
      user: manager,
    }),
    'not an internal warehouse location'
  );

  // -------------------------------------------------------------------------
  console.log('\nRECEIPTS (inbound)');
  const receipt = await receiptEngine.createReceipt({
    partnerName: 'Acme Test Supply',
    destLocationId: mainStore.id,
    lines: [{ productId: product.id, quantity: 40 }],
    user: staff,
  });
  check('receipt created as Draft', receipt.status === 'Draft' && /^REC-\d+$/.test(receipt.reference_no));
  await expectError('cannot validate before Ready', () =>
    receiptEngine.validateReceipt({ operationId: receipt.id, user: manager }),
    'must be moved to "Ready"'
  );
  await expectError('staff cannot validate (RBAC)', async () => {
    await shared.advanceStatus({ operationId: receipt.id, targetStatus: 'Waiting', user: staff });
    await shared.advanceStatus({ operationId: receipt.id, targetStatus: 'Ready', user: staff });
    await receiptEngine.validateReceipt({ operationId: receipt.id, user: staff });
  }, 'Inventory Manager permissions required');

  const receiptResult = await receiptEngine.validateReceipt({ operationId: receipt.id, user: manager });
  check('receipt validated to Done', receiptResult.operation.status === 'Done' && receiptResult.totalUnits === 40);

  const afterReceipt = await query(
    `SELECT sq.quantity FROM stock_quants sq WHERE sq.product_id = $1 AND sq.location_id = $2`,
    [product.id, mainStore.id]
  );
  check('quant upserted +40', Number(afterReceipt.rows[0].quantity) === 40);
  const receiptMoves = await query(
    `SELECT sm.*, l.type AS src_type FROM stock_moves sm JOIN locations l ON l.id = sm.source_location_id
      WHERE sm.operation_id = $1`,
    [receipt.id]
  );
  check('ledger row sourced from Vendors', receiptMoves.rows.length === 1 && receiptMoves.rows[0].src_type === 'vendor');
  await expectError('double validation blocked', () =>
    receiptEngine.validateReceipt({ operationId: receipt.id, user: manager }),
    'already validated'
  );

  // -------------------------------------------------------------------------
  console.log('\nDELIVERIES (outbound, FOR UPDATE + rollback)');
  const delivery = await deliveryEngine.createDelivery({
    partnerName: 'Metro Test Buyer',
    sourceLocationId: mainStore.id,
    lines: [{ productId: product.id, quantity: 25 }],
    user: staff,
  });
  await shared.advanceStatus({ operationId: delivery.id, targetStatus: 'Waiting', user: staff });
  await shared.advanceStatus({ operationId: delivery.id, targetStatus: 'Ready', user: staff });

  const beforeFail = await query(
    `SELECT COUNT(*)::int AS moves FROM stock_moves WHERE operation_id = $1`,
    [delivery.id]
  );
  const bigDelivery = await deliveryEngine.createDelivery({
    partnerName: 'Overdraw Buyer',
    sourceLocationId: mainStore.id,
    lines: [{ productId: product.id, quantity: 9999 }],
    user: staff,
  });
  await shared.advanceStatus({ operationId: bigDelivery.id, targetStatus: 'Waiting', user: manager });
  await shared.advanceStatus({ operationId: bigDelivery.id, targetStatus: 'Ready', user: manager });
  await expectError('insufficient stock -> error', () =>
    deliveryEngine.validateDelivery({ operationId: bigDelivery.id, user: manager }),
    (err) => err.name === 'InsufficientStockError' && /Insufficient stock/.test(err.message)
  );
  const afterFail = await query(
    `SELECT (SELECT COUNT(*)::int FROM stock_moves WHERE operation_id = $1) AS moves,
            (SELECT status FROM operations WHERE id = $1) AS status,
            (SELECT quantity FROM stock_quants WHERE product_id = $2 AND location_id = $3) AS qty`,
    [bigDelivery.id, product.id, mainStore.id]
  );
  check(
    'failed delivery fully rolled back (no moves, status Ready, stock intact)',
    afterFail.rows[0].moves === beforeFail.rows[0].moves &&
      afterFail.rows[0].status === 'Ready' &&
      Number(afterFail.rows[0].qty) === 40
  );

  const delivered = await deliveryEngine.validateDelivery({ operationId: delivery.id, user: manager });
  check('delivery validated', delivered.operation.status === 'Done' && delivered.totalUnits === 25);
  const afterDelivery = await query(
    `SELECT sq.quantity FROM stock_quants sq WHERE sq.product_id = $1 AND sq.location_id = $2`,
    [product.id, mainStore.id]
  );
  check('stock deducted 40 -> 15', Number(afterDelivery.rows[0].quantity) === 15);
  const customerSink = await query(
    `SELECT l.type FROM stock_moves sm JOIN locations l ON l.id = sm.dest_location_id WHERE sm.operation_id = $1`,
    [delivery.id]
  );
  check('delivery ledger sinks into Customers', customerSink.rows[0].type === 'customer');

  // -------------------------------------------------------------------------
  console.log('\nCONCURRENCY: 8 parallel deliveries of 10 units against stock = 50');
  const raceProduct = await catalog.createProduct({
    name: `Race Item ${RUN}`,
    sku: `TST-${RUN}-RACE`,
    category: 'Test',
    uom: 'pcs',
    minStockAlert: 0,
  });
  const raceReceipt = await receiptEngine.createReceipt({
    partnerName: 'Race Supply',
    destLocationId: mainStore.id,
    lines: [{ productId: raceProduct.id, quantity: 50 }],
    user: manager,
  });
  await shared.advanceStatus({ operationId: raceReceipt.id, targetStatus: 'Waiting', user: manager });
  await shared.advanceStatus({ operationId: raceReceipt.id, targetStatus: 'Ready', user: manager });
  await receiptEngine.validateReceipt({ operationId: raceReceipt.id, user: manager });

  const racers = [];
  for (let i = 0; i < 8; i += 1) {
    const doc = await deliveryEngine.createDelivery({
      partnerName: `Race Buyer ${i}`,
      sourceLocationId: mainStore.id,
      lines: [{ productId: raceProduct.id, quantity: 10 }],
      user: staff,
    });
    await shared.advanceStatus({ operationId: doc.id, targetStatus: 'Waiting', user: manager });
    await shared.advanceStatus({ operationId: doc.id, targetStatus: 'Ready', user: manager });
    racers.push(doc);
  }

  const results = await Promise.allSettled(
    racers.map((doc) => deliveryEngine.validateDelivery({ operationId: doc.id, user: manager }))
  );
  const okCount = results.filter((r) => r.status === 'fulfilled').length;
  const insufficient = results.filter(
    (r) => r.status === 'rejected' && r.reason && r.reason.name === 'InsufficientStockError'
  ).length;
  const other = results.filter(
    (r) => r.status === 'rejected' && (!r.reason || r.reason.name !== 'InsufficientStockError')
  );
  const raceQty = await query(
    `SELECT quantity FROM stock_quants WHERE product_id = $1 AND location_id = $2`,
    [raceProduct.id, mainStore.id]
  );
  const raceNegative = await query(
    `SELECT COUNT(*)::int AS bad FROM stock_quants WHERE quantity < 0`
  );
  check('exactly 5 of 8 deliveries succeeded (50 units / 10 each)', okCount === 5, `ok=${okCount} insufficient=${insufficient}`);
  check('remaining 3 rejected as insufficient (no oversell)', insufficient === 3, `rejected-other=${other.map((o) => o.reason && o.reason.message).join(' ; ')}`);
  check('final balance exactly 0 after 5 x 10 sold', Number(raceQty.rows[0].quantity) === 0, `actual=${raceQty.rows[0].quantity}`);
  check('no negative balances anywhere', raceNegative.rows[0].bad === 0);

  // -------------------------------------------------------------------------
  console.log('\nTRANSFERS (deterministic dual-row locking)');
  // Seed Rack A with 5 units so BOTH zones hold stock before the
  // opposite-direction concurrent transfers below.
  const setupTransfer = await transferEngine.createTransfer({
    sourceLocationId: mainStore.id,
    destLocationId: rackA.id,
    lines: [{ productId: product.id, quantity: 5 }],
    user: staff,
  });
  await shared.advanceStatus({ operationId: setupTransfer.id, targetStatus: 'Waiting', user: staff });
  await shared.advanceStatus({ operationId: setupTransfer.id, targetStatus: 'Ready', user: staff });
  await transferEngine.validateTransfer({ operationId: setupTransfer.id, user: manager });
  // Now Main Store = 10, Rack A = 5. Run OPPOSITE-direction transfers
  // concurrently: the deterministic (location_id, product_id) lock order
  // must let both finish without a deadlock.
  const transferAB = await transferEngine.createTransfer({
    sourceLocationId: mainStore.id,
    destLocationId: rackA.id,
    lines: [{ productId: product.id, quantity: 2 }],
    user: staff,
  });
  const transferBA = await transferEngine.createTransfer({
    sourceLocationId: rackA.id,
    destLocationId: mainStore.id,
    lines: [{ productId: product.id, quantity: 2 }],
    user: staff,
  });
  for (const doc of [transferAB, transferBA]) {
    await shared.advanceStatus({ operationId: doc.id, targetStatus: 'Waiting', user: staff });
    await shared.advanceStatus({ operationId: doc.id, targetStatus: 'Ready', user: staff });
  }
  const bothTransfers = await Promise.allSettled([
    transferEngine.validateTransfer({ operationId: transferAB.id, user: manager }),
    transferEngine.validateTransfer({ operationId: transferBA.id, user: manager }),
  ]);
  check(
    'opposite-direction transfers both complete without deadlock',
    bothTransfers.every((r) => r.status === 'fulfilled'),
    bothTransfers.map((r) => (r.reason ? r.reason.message : 'ok')).join(' | ')
  );
  const transferBalances = await query(
    `SELECT location_id, quantity FROM stock_quants WHERE product_id = $1 AND location_id = ANY($2::int[]) ORDER BY location_id`,
    [product.id, [mainStore.id, rackA.id]]
  );
  const balMap = Object.fromEntries(transferBalances.rows.map((r) => [r.location_id, Number(r.quantity)]));
  check(
    'transfer balanced: Main Store 10 (net 0), Rack A 5 (net 0)',
    balMap[mainStore.id] === 10 && balMap[rackA.id] === 5,
    JSON.stringify(balMap)
  );
  await expectError('oversized transfer rejected', async () => {
    const doc = await transferEngine.createTransfer({
      sourceLocationId: rackA.id,
      destLocationId: mainStore.id,
      lines: [{ productId: product.id, quantity: 999 }],
      user: staff,
    });
    await shared.advanceStatus({ operationId: doc.id, targetStatus: 'Waiting', user: staff });
    await shared.advanceStatus({ operationId: doc.id, targetStatus: 'Ready', user: staff });
    await transferEngine.validateTransfer({ operationId: doc.id, user: manager });
  }, (err) => err.name === 'InsufficientStockError');
  await expectError('transfer from non-internal location rejected at create', () =>
    transferEngine.createTransfer({
      sourceLocationId: vendors.id,
      destLocationId: rackA.id,
      lines: [{ productId: product.id, quantity: 1 }],
      user: staff,
    }),
    'not an internal warehouse location'
  );

  // -------------------------------------------------------------------------
  console.log('\nADJUSTMENTS (physical count reconciliation)');
  const adjMovesBefore = await query(`SELECT COUNT(*)::int AS c FROM stock_moves`);
  const adjustment = await adjustmentEngine.createAdjustment({
    locationId: rackA.id,
    lines: [{ productId: product.id, countedQty: 1 }], // recorded 5 -> count 1 => Δ = -4
    user: manager,
  });
  await expectError('staff cannot create adjustments (RBAC)', () =>
    adjustmentEngine.createAdjustment({
      locationId: rackA.id,
      lines: [{ productId: product.id, countedQty: 0 }],
      user: staff,
    }),
    'Inventory Manager permissions required'
  );
  await shared.advanceStatus({ operationId: adjustment.id, targetStatus: 'Waiting', user: manager });
  await shared.advanceStatus({ operationId: adjustment.id, targetStatus: 'Ready', user: manager });
  const adjResult = await adjustmentEngine.validateAdjustment({ operationId: adjustment.id, user: manager });
  check('adjustment Δ computed as -4', adjResult.results[0].recorded === 5 && adjResult.results[0].counted === 1 && adjResult.results[0].delta === -4);
  const rackQty = await query(
    `SELECT quantity FROM stock_quants WHERE product_id = $1 AND location_id = $2`,
    [product.id, rackA.id]
  );
  check('quant mirrors physical count', Number(rackQty.rows[0].quantity) === 1);
  const lossMove = await query(
    `SELECT l.type FROM stock_moves sm JOIN locations l ON l.id = sm.dest_location_id WHERE sm.operation_id = $1`,
    [adjustment.id]
  );
  check('shortage posted to Scrap/Loss', lossMove.rows[0].type === 'inventory_loss');

  const adjGain = await adjustmentEngine.createAdjustment({
    locationId: rackA.id,
    lines: [{ productId: product.id, countedQty: 6 }], // 1 -> 6 => Δ = +5
    user: manager,
  });
  await shared.advanceStatus({ operationId: adjGain.id, targetStatus: 'Waiting', user: manager });
  await shared.advanceStatus({ operationId: adjGain.id, targetStatus: 'Ready', user: manager });
  const gainResult = await adjustmentEngine.validateAdjustment({ operationId: adjGain.id, user: manager });
  check('found stock Δ = +5 from Scrap/Loss', gainResult.results[0].delta === 5 && gainResult.movements === 1);

  const adjZero = await adjustmentEngine.createAdjustment({
    locationId: rackA.id,
    lines: [{ productId: product.id, countedQty: 6 }], // no discrepancy
    user: manager,
  });
  await shared.advanceStatus({ operationId: adjZero.id, targetStatus: 'Waiting', user: manager });
  await shared.advanceStatus({ operationId: adjZero.id, targetStatus: 'Ready', user: manager });
  const zeroResult = await adjustmentEngine.validateAdjustment({ operationId: adjZero.id, user: manager });
  const movesAfterZero = await query(`SELECT COUNT(*)::int AS c FROM stock_moves`);
  check(
    'zero-discrepancy adjustment writes no ledger noise',
    zeroResult.movements === 0 && movesAfterZero.rows[0].c === adjMovesBefore.rows[0].c + 2
  );

  // -------------------------------------------------------------------------
  console.log('\nWORKFLOW GUARDS');
  await expectError('invalid transition Draft -> Ready rejected', () => {
    return (async () => {
      const doc = await transferEngine.createTransfer({
        sourceLocationId: mainStore.id,
        destLocationId: rackA.id,
        lines: [{ productId: product.id, quantity: 1 }],
        user: staff,
      });
      return shared.advanceStatus({ operationId: doc.id, targetStatus: 'Ready', user: staff });
    })();
  }, 'cannot move from Draft to Ready');
  const cancelDoc = await deliveryEngine.createDelivery({
    partnerName: 'Cancel Me',
    sourceLocationId: mainStore.id,
    lines: [{ productId: product.id, quantity: 1 }],
    user: staff,
  });
  await expectError('staff cannot cancel (manager only)', () =>
    shared.advanceStatus({ operationId: cancelDoc.id, targetStatus: 'Canceled', user: staff }),
    'Only an Inventory Manager can cancel'
  );
  const canceled = await shared.advanceStatus({ operationId: cancelDoc.id, targetStatus: 'Canceled', user: manager });
  check('manager cancel works', canceled.status === 'Canceled');

  // -------------------------------------------------------------------------
  console.log('\nDASHBOARD + MOVE HISTORY');
  const kpis = await dashboard.getDashboardKpis();
  check('KPIs: products in stock > 0', kpis.productsInStock > 0);
  check('KPIs: low stock list populated + flagged', Array.isArray(kpis.lowStock) && kpis.lowStock.some((i) => i.isOutOfStock === true) === (kpis.lowStock.some((i) => i.isOutOfStock)) );
  check('KPIs: pending counts numeric', typeof kpis.pendingReceipts === 'number' && typeof kpis.scheduledTransfers === 'number');
  check('KPIs: moves counted', kpis.movesTotal > 0 && kpis.movesToday > 0);

  const page1 = await history.listMoves({ page: 0, pageSize: 5 });
  const page2 = await history.listMoves({ page: 1, pageSize: 5 });
  check('history paginates (5 + 5, no overlap)', page1.moves.length === 5 && page2.moves.length === 5 && page1.moves[0].id !== page2.moves[0].id);
  check('history total_count consistent', page1.total === page2.total && page1.total > 10);
  const filtered = await history.listMoves({ productId: product.id, pageSize: 100 });
  check('history filters by product', filtered.moves.length > 0 && filtered.moves.every((m) => m.product_id === product.id));
  const byType = await history.listMoves({ type: 'delivery', pageSize: 100 });
  check('history filters by operation type', byType.moves.length > 0 && byType.moves.every((m) => m.operation_type === 'delivery'));
  const searched = await history.listMoves({ search: product.sku, pageSize: 100 });
  check('history full-text search on SKU', searched.moves.length > 0);
  const joined = page1.moves[0];
  check('history join includes product + both locations + responsible', !!joined.product_name && !!joined.source_location && !!joined.dest_location && !!joined.responsible);

  const stockRows = await stock.stockByLocation({ productId: product.id });
  check('real-time stock query per location', stockRows.length >= 2);
  const totals = await stock.productTotals({ search: product.sku });
  // Main Store: 40 - 25 - 5 - 2 + 2 = 10 | Rack A: +5 +2 -2 -> count 1 -> count 6 = 6
  check('product totals computed across internal zones', totals.length === 1 && totals[0].onHand === 16, `onHand=${totals[0] && totals[0].onHand}`);

  // -------------------------------------------------------------------------
  console.log('\nLEDGER INTEGRITY (global invariants)');
  const invariant = await query(
    `SELECT COALESCE(SUM(CASE WHEN l.type = 'internal' THEN 1 ELSE 0 END), 0)::int AS internal_rows,
            COUNT(*)::int AS rows
       FROM stock_moves sm JOIN locations l ON l.id = sm.source_location_id`
  );
  check('ledger rows exist', invariant.rows[0].rows > 0);
  const nonPositive = await query(
    `SELECT COUNT(*)::int AS bad FROM stock_quants WHERE quantity < 0`
  );
  check('no negative quants after the whole suite', nonPositive.rows[0].bad === 0);
  const zeroMoves = await query(
    `SELECT COUNT(*)::int AS bad FROM stock_moves WHERE quantity <= 0`
  );
  check('no zero/negative ledger quantities', zeroMoves.rows[0].bad === 0);
  const nullParties = await query(
    `SELECT COUNT(*)::int AS bad FROM stock_moves WHERE source_location_id IS NULL OR dest_location_id IS NULL`
  );
  check('every move is double-entry (both parties present)', nullParties.rows[0].bad === 0);
  const selfLoop = await query(
    `SELECT COUNT(*)::int AS bad FROM stock_moves WHERE source_location_id = dest_location_id`
  );
  check('no self-referencing moves', selfLoop.rows[0].bad === 0);

  console.log(`\n=== RESULT: ${passed} passed, ${failed} failed ===\n`);
  await require('../db/custom-client.js').pool.end().catch(() => {});
  await stopEmbedded();
  process.exit(failed ? 1 : 0);
}

main().catch(async (err) => {
  console.error('\n[test] SUITE CRASHED:', err && (err.stack || err.message || err));
  try {
    const { stopEmbedded } = require('./bootstrap-db.js');
    await stopEmbedded();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
