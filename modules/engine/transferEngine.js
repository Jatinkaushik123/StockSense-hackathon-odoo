/**
 * modules/engine/transferEngine.js
 * ------------------------------------------------------------------
 * Internal Transfers (TRF-XXXX) between internal zones
 * (Main Store -> Production Floor, Rack A -> Rack B, ...).
 *
 * Validation (runInTransaction):
 *   1. Lock document row FOR UPDATE.
 *   2. Lock BOTH quant rows (source + destination) in deterministic
 *      (location_id, product_id) order — concurrent opposite-direction
 *      transfers cannot deadlock each other.
 *   3. Verify availability; insufficient -> THROW -> ROLLBACK.
 *   4. Atomically decrement source and increment destination.
 *   5. Append internal ledger row (source -> destination, no virtual party).
 *   6. Flip status to Done.
 */
const { runInTransaction } = require('../../db/custom-client.js');
const {
  InsufficientStockError,
  assertManager,
  assertStaffOrManager,
  assertInternalLocation,
  validateProductsExist,
  createOperationDraft,
  loadLines,
  claimForPosting,
  lockQuantRows,
  decrementQuantGuarded,
  incrementQuant,
  writeMove,
  markDone,
} = require('./shared.js');
const { AppError } = require('../security/errorHandler.js');

/**
 * Create an internal transfer document (status Draft).
 * @param {{sourceLocationId:number, destLocationId:number, lines:Array<{productId:number, quantity:number}>, user:object}} input
 */
async function createTransfer({ sourceLocationId, destLocationId, lines, user }) {
  assertStaffOrManager(user);
  if (sourceLocationId === destLocationId) {
    throw new AppError('Source and destination locations must differ.');
  }
  return runInTransaction(async (client) => {
    await validateProductsExist(client, lines.map((l) => l.productId));
    await assertInternalLocation(client, sourceLocationId, 'Source location');
    await assertInternalLocation(client, destLocationId, 'Destination location');

    const operation = await createOperationDraft(client, {
      type: 'internal',
      partnerName: null,
      userId: user.id,
      lines: lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        sourceLocationId,
        destLocationId,
      })),
    });
    return operation;
  });
}

/**
 * Validate (execute) an internal transfer. Inventory Manager only.
 */
async function validateTransfer({ operationId, user }) {
  assertManager(user);
  return runInTransaction(async (client) => {
    const operation = await claimForPosting(client, operationId, 'internal');
    const lines = await loadLines(client, operationId);
    if (!lines.length) {
      throw new AppError(`${operation.reference_no} has no line items to post.`);
    }

    const productIds = [...new Set(lines.map((l) => l.product_id))];
    const locationIds = [...new Set(lines.flatMap((l) => [l.source_location_id, l.dest_location_id]))];

    // Deterministic lock order across BOTH endpoints prevents deadlocks
    // between concurrent transfers moving stock in opposite directions.
    const balances = await lockQuantRows(client, productIds, locationIds);

    const requested = new Map();
    for (const line of lines) {
      const key = `${line.product_id}:${line.source_location_id}`;
      requested.set(key, (requested.get(key) || 0) + Number(line.quantity));
    }

    const shortfalls = [];
    for (const [key, qty] of requested) {
      const available = balances.get(key) ?? 0;
      if (available < qty) {
        const [productId] = key.split(':').map(Number);
        const line = lines.find((l) => l.product_id === productId);
        shortfalls.push({
          productName: line ? line.product_name : `#${productId}`,
          sku: line ? line.sku : '',
          required: qty,
          available,
        });
      }
    }
    if (shortfalls.length) throw new InsufficientStockError(shortfalls);

    let totalUnits = 0;
    for (const line of lines) {
      const quantity = Number(line.quantity);
      if (!(quantity > 0)) throw new AppError('Transfer lines must have a positive quantity.');

      const remaining = await decrementQuantGuarded(
        client,
        line.product_id,
        line.source_location_id,
        quantity
      );
      if (remaining === null) {
        throw new InsufficientStockError([
          { productName: line.product_name, sku: line.sku, required: quantity, available: 0 },
        ]);
      }

      await incrementQuant(client, line.product_id, line.dest_location_id, quantity);
      await writeMove(client, {
        operationId,
        productId: line.product_id,
        sourceLocationId: line.source_location_id,
        destLocationId: line.dest_location_id,
        quantity,
      });
      totalUnits += quantity;
    }

    const done = await markDone(client, operationId);
    return { operation: done, lines: lines.length, totalUnits };
  });
}

module.exports = { createTransfer, validateTransfer };
