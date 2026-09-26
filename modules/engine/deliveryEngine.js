/**
 * modules/engine/deliveryEngine.js
 * ------------------------------------------------------------------
 * Outbound Deliveries (DEL-XXXX) with Picking & Packing workflow:
 *   Draft (created) -> Waiting (confirmed) -> Ready (picked & packed)
 *   -> Done (dispatched, stock deducted).
 *
 * Validation (runInTransaction):
 *   1. Lock document row FOR UPDATE (single posting guarantee).
 *   2. Lock source quant rows FOR UPDATE in deterministic order.
 *   3. Verify available >= requested; otherwise THROW -> full ROLLBACK.
 *   4. Guarded decrement (AND quantity >= n) so balances can never go negative.
 *   5. Append ledger rows with dest_location_id = "Customers" virtual location.
 *   6. Flip status to Done.
 */
const { runInTransaction } = require('../../db/custom-client.js');
const {
  InsufficientStockError,
  assertManager,
  assertStaffOrManager,
  assertInternalLocation,
  validateProductsExist,
  systemLocationId,
  createOperationDraft,
  loadLines,
  claimForPosting,
  lockQuantRows,
  decrementQuantGuarded,
  writeMove,
  markDone,
} = require('./shared.js');
const { AppError } = require('../security/errorHandler.js');

/**
 * Create an outbound delivery document (status Draft).
 * @param {{partnerName?:string, sourceLocationId:number, lines:Array<{productId:number, quantity:number, sourceLocationId?:number}>, user:object}} input
 */
async function createDelivery({ partnerName = null, sourceLocationId, lines, user }) {
  assertStaffOrManager(user);
  return runInTransaction(async (client) => {
    const resolved = lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      sourceLocationId: line.sourceLocationId ?? sourceLocationId,
    }));
    for (const line of resolved) {
      if (!line.sourceLocationId) throw new AppError('Every delivery line needs a pick location.');
    }
    await validateProductsExist(client, resolved.map((l) => l.productId));

    const uniqueSources = [...new Set(resolved.map((l) => l.sourceLocationId))];
    for (const sourceId of uniqueSources) {
      await assertInternalLocation(client, sourceId, 'Pick location');
    }

    const operation = await createOperationDraft(client, {
      type: 'delivery',
      partnerName,
      userId: user.id,
      lines: resolved.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        sourceLocationId: l.sourceLocationId,
        destLocationId: null, // resolved to "Customers" at validation time
      })),
    });
    return operation;
  });
}

/**
 * Validate (dispatch) a delivery: availability check, stock out,
 * ledger posting, status Done. Inventory Manager only.
 */
async function validateDelivery({ operationId, user }) {
  assertManager(user);
  return runInTransaction(async (client) => {
    const operation = await claimForPosting(client, operationId, 'delivery');
    const customerLocationId = await systemLocationId(client, 'customer');
    const lines = await loadLines(client, operationId);
    if (!lines.length) {
      throw new AppError(`${operation.reference_no} has no line items to post.`);
    }

    // Aggregate per (product, source) so duplicate lines are checked together.
    const requested = new Map();
    for (const line of lines) {
      const key = `${line.product_id}:${line.source_location_id}`;
      requested.set(key, (requested.get(key) || 0) + Number(line.quantity));
    }

    const productIds = [...new Set(lines.map((l) => l.product_id))];
    const locationIds = [...new Set(lines.map((l) => l.source_location_id))];

    // Row-level locks (FOR UPDATE) — deterministic order inside lockQuantRows.
    const balances = await lockQuantRows(client, productIds, locationIds);

    const shortfalls = [];
    for (const [key, qty] of requested) {
      const [productId, locationId] = key.split(':').map(Number);
      const available = balances.get(key) ?? 0;
      if (available < qty) {
        const line = lines.find(
          (l) => l.product_id === productId && l.source_location_id === locationId
        );
        shortfalls.push({
          productName: line ? line.product_name : `#${productId}`,
          sku: line ? line.sku : '',
          required: qty,
          available,
        });
      }
    }
    if (shortfalls.length) {
      // Rollback: nothing below this line ever runs.
      throw new InsufficientStockError(shortfalls);
    }

    let totalUnits = 0;
    for (const [key, qty] of requested) {
      const [productId, locationId] = key.split(':').map(Number);
      // Defense in depth: conditional decrement cannot take a balance negative.
      const remaining = await decrementQuantGuarded(client, productId, locationId, qty);
      if (remaining === null) {
        throw new InsufficientStockError([
          { productName: `#${productId}`, sku: '', required: qty, available: balances.get(key) ?? 0 },
        ]);
      }
      await writeMove(client, {
        operationId,
        productId,
        sourceLocationId: locationId,
        destLocationId: customerLocationId,
        quantity: qty,
      });
      totalUnits += qty;
    }

    const done = await markDone(client, operationId);
    return { operation: done, lines: requested.size, totalUnits };
  });
}

module.exports = { createDelivery, validateDelivery };
