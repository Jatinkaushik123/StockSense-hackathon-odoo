/**
 * modules/engine/adjustmentEngine.js
 * ------------------------------------------------------------------
 * Stock Adjustments (ADJ-XXXX) — reconcile physical counts with the
 * digital ledger.
 *
 * Validation (runInTransaction):
 *   1. Lock the document row FOR UPDATE (no double posting).
 *   2. Lock quant rows for every counted product at the location.
 *   3. Compute discrepancy per line:  Δ = Counted - Recorded.
 *   4. Set stock_quants to the physical count (absolute reconciliation).
 *   5. Post a compensating ledger entry against the "Scrap/Loss"
 *      virtual location:
 *        Δ > 0 (found)  : Scrap/Loss  -> location
 *        Δ < 0 (missing): location    -> Scrap/Loss
 *        Δ = 0          : no movement written
 *   6. Flip status to Done.
 * Inventory Manager only (create + validate).
 */
const { runInTransaction } = require('../../db/custom-client.js');
const {
  assertManager,
  assertInternalLocation,
  validateProductsExist,
  systemLocationId,
  createOperationDraft,
  loadLines,
  claimForPosting,
  lockQuantRows,
  setQuant,
  writeMove,
  markDone,
} = require('./shared.js');
const { AppError } = require('../security/errorHandler.js');

/**
 * Create a stock adjustment document (status Draft).
 * `countedQty` (not a delta) is stored per line — the discrepancy is
 * computed at validation time against the then-current balance.
 * @param {{locationId:number, lines:Array<{productId:number, countedQty:number}>, user:object}} input
 */
async function createAdjustment({ locationId, lines, user }) {
  assertManager(user);
  return runInTransaction(async (client) => {
    await validateProductsExist(client, lines.map((l) => l.productId));
    await assertInternalLocation(client, locationId, 'Count location');

    const operation = await createOperationDraft(client, {
      type: 'adjustment',
      partnerName: null,
      userId: user.id,
      lines: lines.map((l) => ({
        productId: l.productId,
        quantity: l.countedQty,
        sourceLocationId: null,
        destLocationId: locationId, // the location that was physically counted
      })),
    });
    return operation;
  });
}

/**
 * Validate (reconcile) a stock adjustment. Inventory Manager only.
 */
async function validateAdjustment({ operationId, user }) {
  assertManager(user);
  return runInTransaction(async (client) => {
    const operation = await claimForPosting(client, operationId, 'adjustment');
    const scrapLocationId = await systemLocationId(client, 'inventory_loss');
    const lines = await loadLines(client, operationId);
    if (!lines.length) {
      throw new AppError(`${operation.reference_no} has no counted lines to reconcile.`);
    }

    const locationIds = [...new Set(lines.map((l) => l.dest_location_id))];
    if (locationIds.length !== 1) {
      throw new AppError('An adjustment must target exactly one location.');
    }
    const locationId = locationIds[0];

    const productIds = [...new Set(lines.map((l) => l.product_id))];
    const balances = await lockQuantRows(client, productIds, [locationId]);

    const results = [];
    let movements = 0;

    for (const line of lines) {
      const counted = Number(line.quantity);
      const recorded = balances.get(`${line.product_id}:${locationId}`) ?? 0;
      const delta = Math.round((counted - recorded) * 100) / 100;

      // Absolute reconciliation: the cache now mirrors the physical count.
      await setQuant(client, line.product_id, locationId, counted);

      if (delta > 0) {
        await writeMove(client, {
          operationId,
          productId: line.product_id,
          sourceLocationId: scrapLocationId,
          destLocationId: locationId,
          quantity: Math.abs(delta),
        });
        movements += 1;
      } else if (delta < 0) {
        await writeMove(client, {
          operationId,
          productId: line.product_id,
          sourceLocationId: locationId,
          destLocationId: scrapLocationId,
          quantity: Math.abs(delta),
        });
        movements += 1;
      }

      results.push({
        productId: line.product_id,
        productName: line.product_name,
        sku: line.sku,
        recorded,
        counted,
        delta,
      });
    }

    const done = await markDone(client, operationId);
    return { operation: done, lines: lines.length, movements, results };
  });
}

module.exports = { createAdjustment, validateAdjustment };
