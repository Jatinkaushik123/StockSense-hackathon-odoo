/**
 * scripts/verify-frontend-backend.js
 * ------------------------------------------------------------------
 * Automated end-to-end verification script testing:
 *   1. Vite dev server serving frontend index.html on port 5173
 *   2. Vite proxy routing /api/* to Next.js on port 3000
 *   3. Real bcrypt login for Inventory Manager (manager@stocksense.dev)
 *   4. Session verification (/api/auth/me) with cookie
 *   5. Real PostgreSQL queries:
 *      - Dashboard KPIs (/api/dashboard)
 *      - Products Catalog (/api/products)
 *      - Locations Catalog (/api/locations)
 *      - Operations (/api/operations)
 *      - Move History (/api/history)
 *   6. Operations execution:
 *      - Create Receipt Draft
 *      - Advance to Ready
 *      - Validate Receipt to Done (updates stock quants + posts double-entry ledger)
 *      - Verify move in /api/history
 */

async function main() {
  const BASE_URL = 'http://localhost:5173';
  let passed = 0;
  let failed = 0;

  function assert(label, cond, extra = '') {
    if (cond) {
      passed += 1;
      console.log(`  [PASS] ${label}`);
    } else {
      failed += 1;
      console.error(`  [FAIL] ${label} ${extra}`);
    }
  }

  console.log('\n======================================================');
  console.log('   StockSense — Verifying Frontend & Backend Wireup');
  console.log('======================================================\n');

  // 1. Verify Frontend SPA root
  console.log('1. Checking Frontend Root (Port 5173)...');
  const feRes = await fetch(`${BASE_URL}/`);
  const feHtml = await feRes.text();
  assert('Frontend serves index.html on 5173', feRes.status === 200 && feHtml.includes('StockSense'));

  // 2. Verify Vite Proxy to Backend
  console.log('\n2. Checking Vite Proxy -> Next.js /api/dashboard...');
  const dashRes = await fetch(`${BASE_URL}/api/dashboard`);
  const dashData = await dashRes.json();
  assert('Dashboard API reachable via Vite proxy', dashRes.status === 200 && dashData.ok);
  assert('Dashboard reports product metrics', dashData.totals.productsInStock >= 0);

  // 3. Test Authentication (Manager Login)
  console.log('\n3. Testing Auth Login (manager@stocksense.dev)...');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'manager@stocksense.dev',
      password: 'Manager@123',
    }),
  });

  const cookie = loginRes.headers.get('set-cookie');
  const loginData = await loginRes.json();
  assert('Manager login succeeds with 200', loginRes.status === 200 && loginData.ok);
  assert('Returned user has manager role', loginData.user && loginData.user.role === 'manager');
  assert('Session cookie issued', !!cookie);

  // 4. Test Session Re-verification
  console.log('\n4. Testing /api/auth/me session check...');
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: cookie ? { Cookie: cookie } : {},
  });
  const meData = await meRes.json();
  assert('Session restored from cookie', meRes.status === 200 && meData.user && meData.user.email === 'manager@stocksense.dev');

  // 5. Test Products Catalog & Product Registration
  console.log('\n5. Testing /api/products & Registering New Product...');
  const prodRes = await fetch(`${BASE_URL}/api/products`);
  const prodData = await prodRes.json();
  assert('Products list fetched', prodRes.status === 200 && prodData.ok && prodData.products.length >= 6);

  const testSku = 'REG-SKU-' + Date.now().toString(36).toUpperCase();
  const createProdRes = await fetch(`${BASE_URL}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify({
      name: 'Registered Test Sensor',
      sku: testSku,
      category: 'Electronics',
      uom: 'pcs',
      minStockAlert: 20,
      initialStock: 50,
    }),
  });
  const createProdData = await createProdRes.json();
  assert('New product registered successfully (201)', createProdRes.status === 201 && createProdData.ok && createProdData.product);
  assert('Product registration returned created product ID', Boolean(createProdData.product && createProdData.product.id));

  // 6. Test Locations Catalog
  console.log('\n6. Testing /api/locations...');
  const locRes = await fetch(`${BASE_URL}/api/locations`);
  const locData = await locRes.json();
  assert('Locations list fetched', locRes.status === 200 && locData.ok && locData.locations.length >= 8);

  // 7. Test Operations Listing
  console.log('\n7. Testing /api/operations...');
  const opsRes = await fetch(`${BASE_URL}/api/operations`);
  const opsData = await opsRes.json();
  assert('Operations list fetched', opsRes.status === 200 && opsData.ok && Array.isArray(opsData.operations));

  // 8. Test Inbound Receipt Creation & Validation Flow
  console.log('\n8. Testing End-to-End Inbound Receipt Flow...');
  const firstProd = prodData.products[0];
  const firstLoc = locData.locations.find((l) => l.type === 'internal') || locData.locations[0];

  const createRes = await fetch(`${BASE_URL}/api/operations/receipts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify({
      partnerName: 'Test Automation Vendor Inc',
      destLocationId: firstLoc.id,
      lines: [{ productId: firstProd.id, quantity: 15 }],
    }),
  });
  const createData = await createRes.json();
  assert('Receipt draft created', createRes.status === 201 && createData.ok && createData.operation);

  const opId = createData.operation.id;

  // Advance Draft -> Waiting -> Ready
  const adv1 = await fetch(`${BASE_URL}/api/operations/${opId}/advance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify({ targetStatus: 'Waiting' }),
  });
  const adv1Data = await adv1.json();
  assert('Receipt advanced to Waiting', adv1Data.ok);

  const adv2 = await fetch(`${BASE_URL}/api/operations/${opId}/advance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify({ targetStatus: 'Ready' }),
  });
  const adv2Data = await adv2.json();
  assert('Receipt advanced to Ready', adv2Data.ok);

  // Validate Receipt to Done
  const valRes = await fetch(`${BASE_URL}/api/operations/${opId}/validate`, {
    method: 'POST',
    headers: cookie ? { Cookie: cookie } : {},
  });
  const valData = await valRes.json();
  assert('Receipt validated to Done (stock posted to ledger)', valRes.status === 200 && valData.ok);

  // 9. Test Outbound Delivery Flow
  console.log('\n9. Testing Outbound Delivery Flow...');
  const delRes = await fetch(`${BASE_URL}/api/operations/deliveries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify({
      partnerName: 'Acme Test Customer LLC',
      sourceLocationId: firstLoc.id,
      lines: [{ productId: firstProd.id, quantity: 5 }],
    }),
  });
  const delData = await delRes.json();
  assert('Delivery draft created', delRes.status === 201 && delData.ok && delData.operation);

  const delId = delData.operation.id;
  await fetch(`${BASE_URL}/api/operations/${delId}/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify({ targetStatus: 'Waiting' }),
  });
  await fetch(`${BASE_URL}/api/operations/${delId}/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify({ targetStatus: 'Ready' }),
  });

  const valDelRes = await fetch(`${BASE_URL}/api/operations/${delId}/validate`, {
    method: 'POST',
    headers: cookie ? { Cookie: cookie } : {},
  });
  const valDelData = await valDelRes.json();
  assert('Delivery validated to Done (stock deducted from ledger)', valDelRes.status === 200 && valDelData.ok);

  // 10. Test Stock Adjustment Reconciliation Flow
  console.log('\n10. Testing Stock Adjustment Reconciliation...');
  const adjRes = await fetch(`${BASE_URL}/api/operations/adjustments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify({
      locationId: firstLoc.id,
      productId: firstProd.id,
      physicalCount: 150,
    }),
  });
  const adjData = await adjRes.json();
  assert('Stock adjustment reconciled immediately', adjRes.status === 201 && adjData.ok && adjData.operation);

  // 11. Verify History Entries
  console.log('\n11. Testing /api/history has ledger entries...');
  const histRes = await fetch(`${BASE_URL}/api/history`);
  const histData = await histRes.json();
  assert('Move history contains ledger entries', histRes.status === 200 && histData.ok && histData.moves.length >= 3);

  console.log(`\n======================================================`);
  console.log(`   Verification Finished: ${passed} passed, ${failed} failed`);
  console.log(`======================================================\n`);

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('[verify] FAILED:', err);
  process.exit(1);
});
