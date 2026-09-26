/**
 * modules/engine/receiptEngine.js
 * ------------------------------------------------------------------
 * Inbound Receipts (REC-XXXX).
 * Workflow: Draft -> Waiting -> Ready -> Done.
 * Validation (runInTransaction):
 *   1. Lock the document row (no double posting).
 *   2. Atomically upsert destination stock_quants (+quantity).
 *   3. Append immutable ledger rows with source_location_id = "Vendors"
 *      system virtual location.
 *   4. Flip status to Done.
 */
const { runInTransaction } = require('../../db/custom-client.js');
const {
  assertManager,
  assertStaffOrManager,
  assertInternalLocation,
  validateProductsExist,
  systemLocationId,
  createOperationDraft,
  loadLines,
  claimForPosting,
  incrementQuant,
  writeMove,
  markDone,
} = require('./shared.js');
const { AppError } = require('../security/errorHandler.js');

/**
 * Create an inbound receipt document (status Draft).
 * @param {{partnerName?:string, destLocationId:number, lines:Array<{productId:number, quantity:number, destLocationId?:number}>, user:object}} input
 */
async function createReceipt({ partnerName = null, destLocationId, lines, user }) {
  assertStaffOrManager(user);
  return runInTransaction(async (client) => {
    const resolved = lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      destLocationId: line.destLocationId ?? destLocationId,
    }));
    for (const line of resolved) {
      if (!line.destLocationId) throw new AppError('Every receipt line needs a destination location.');
    }
    await validateProductsExist(client, resolved.map((l) => l.productId));

    const uniqueDests = [...new Set(resolved.map((l) => l.destLocationId))];
    for (const destId of uniqueDests) {
      await assertInternalLocation(client, destId, 'Receipt destination');
    }

    const operation = await createOperationDraft(client, {
      type: 'receipt',
      partnerName,
      userId: user.id,
      lines: resolved.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
        sourceLocationId: null, // resolved to "Vendors" at validation time
        destLocationId: l.destLocationId,
      })),
    });
    return operation;
  });
}

/**
 * Validate (post) a receipt: stock in + ledger + status Done.
 * Inventory Manager only.
 */
async function validateReceipt({ operationId, user }) {
  assertManager(user);
  return runInTransaction(async (client) => {
    const operation = await claimForPosting(client, operationId, 'receipt');
    const vendorLocationId = await systemLocationId(client, 'vendor');
    const lines = await loadLines(client, operationId);
    // A document with no line items must never "succeed" by posting nothing.
    if (!lines.length) {
      throw new AppError(`${operation.reference_no} has no line items to post.`);
    }

    let totalUnits = 0;
    for (const line of lines) {
      const quantity = Number(line.quantity);
      if (quantity <= 0) throw new AppError(`Receipt ${operation.reference_no} has an invalid line quantity.`);
      await incrementQuant(client, line.product_id, line.dest_location_id, quantity);
      await writeMove(client, {
        operationId,
        productId: line.product_id,
        sourceLocationId: vendorLocationId,
        destLocationId: line.dest_location_id,
        quantity,
      });
      totalUnits += quantity;
    }

    const done = await markDone(client, operationId);
    return { operation: done, lines: lines.length, totalUnits };
  });
}

module.exports = { createReceipt, validateReceipt };
