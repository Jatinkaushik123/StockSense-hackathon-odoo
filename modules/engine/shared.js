/**
 * modules/engine/shared.js
 * ------------------------------------------------------------------
 * Shared primitives for all posting engines (receipt / delivery /
 * transfer / adjustment). Every helper here runs INSIDE a
 * runInTransaction() unit of work and uses parameterized SQL only.
 *
 * Concurrency model:
 *  - Document rows are locked with `SELECT ... FOR UPDATE` before posting
 *    (double-validation impossible: the second transaction sees Done).
 *  - Quant rows are locked in a deterministic (location_id, product_id)
 *    order to make concurrent multi-line transfers deadlock-safe.
 *  - Decrements are additionally guarded with `AND quantity >= $n`
 *    so a negative balance can never be committed even if a future
 *    code path forgets the FOR UPDATE pre-check.
 */
const { runInTransaction, query } = require('../../db/custom-client.js');
const { AppError } = require('../security/errorHandler.js');

const OPERATION_TYPES = ['receipt', 'delivery', 'internal', 'adjustment'];
const TYPE_LABELS = {
  receipt: 'Receipt',
  delivery: 'Delivery',
  internal: 'Internal Transfer',
  adjustment: 'Stock Adjustment',
};

/** Allowed workflow transitions (Done is only reachable via engines). */
const STATUS_TRANSITIONS = {
  Draft: ['Waiting', 'Canceled'],
  Waiting: ['Ready', 'Canceled'],
  Ready: ['Canceled'],
  Done: [],
  Canceled: [],
};

// Static per-type SQL — the sequence name is selected by a whitelist map,
// never interpolated from user input.
const REFERENCE_SQL = {
  receipt: "SELECT 'REC-' || lpad(nextval('seq_receipt')::text, 4, '0') AS reference_no",
  delivery: "SELECT 'DEL-' || lpad(nextval('seq_delivery')::text, 4, '0') AS reference_no",
  internal: "SELECT 'TRF-' || lpad(nextval('seq_transfer')::text, 4, '0') AS reference_no",
  adjustment: "SELECT 'ADJ-' || lpad(nextval('seq_adjustment')::text, 4, '0') AS reference_no",
};

class InsufficientStockError extends AppError {
  constructor(shortfalls) {
    const detail = shortfalls
      .map((s) => `${s.productName} (${s.sku}): required ${s.required}, available ${s.available}`)
      .join('; ');
    super(`Insufficient stock — ${detail}`, 409);
    this.name = 'InsufficientStockError';
    this.shortfalls = shortfalls;
  }
}

function assertManager(user) {
  if (!user || user.role !== 'manager') {
    throw new AppError('Inventory Manager permissions required for this action.', 403);
  }
}

function assertStaffOrManager(user) {
  if (!user || !['manager', 'staff'].includes(user.role)) {
    throw new AppError('Please sign in to continue.', 401);
  }
}

// ---------------------------------------------------------------------------
// Location helpers
// ---------------------------------------------------------------------------

/** Resolve a system virtual location (vendor / customer / inventory_loss). */
async function systemLocationId(client, type) {
  const { rows } = await client.query(
    `SELECT id, name FROM locations WHERE type = $1 ORDER BY id LIMIT 1`,
    [type]
  );
  if (!rows[0]) {
    throw new AppError(`System location of type "${type}" is missing. Re-run the database seed.`, 500);
  }
  return rows[0].id;
}

async function getLocation(client, locationId) {
  const { rows } = await client.query(
    `SELECT id, name, warehouse_name, type FROM locations WHERE id = $1`,
    [locationId]
  );
  if (!rows[0]) throw new AppError('Location not found.', 404);
  return rows[0];
}

/** Physical stock may only land in / leave from internal locations. */
async function assertInternalLocation(client, locationId, label = 'Location') {
  const loc = await getLocation(client, locationId);
  if (loc.type !== 'internal') {
    throw new AppError(`${label} "${loc.name}" is not an internal warehouse location.`);
  }
  return loc;
}

async function validateProductsExist(client, productIds) {
  const unique = [...new Set(productIds)];
  if (!unique.length) throw new AppError('No product lines were submitted.');
  const { rows } = await client.query(
    `SELECT id FROM products WHERE id = ANY($1::int[])`,
    [unique]
  );
  const found = new Set(rows.map((r) => r.id));
  const missing = unique.filter((id) => !found.has(id));
  if (missing.length) {
    throw new AppError(`Unknown product id(s): ${missing.join(', ')}.`);
  }
}

// ---------------------------------------------------------------------------
// Quant (balance cache) helpers
// ---------------------------------------------------------------------------

/**
 * Lock quant rows for the given products/locations in deterministic order.
 * @returns {Map<string, number>} "productId:locationId" -> quantity
 */
async function lockQuantRows(client, productIds, locationIds) {
  const { rows } = await client.query(
    `SELECT product_id, location_id, quantity
       FROM stock_quants
      WHERE product_id = ANY($1::int[]) AND location_id = ANY($2::int[])
      ORDER BY location_id, product_id
      FOR UPDATE`,
    [productIds, locationIds]
  );
  const map = new Map();
  for (const row of rows) {
    map.set(`${row.product_id}:${row.location_id}`, Number(row.quantity));
  }
  return map;
}

/** Atomic upsert: +quantity (receipts, transfer destinations). */
async function incrementQuant(client, productId, locationId, quantity) {
  const { rows } = await client.query(
    `INSERT INTO stock_quants (product_id, location_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (product_id, location_id)
     DO UPDATE SET quantity = stock_quants.quantity + EXCLUDED.quantity
     RETURNING quantity`,
    [productId, locationId, quantity]
  );
  return Number(rows[0].quantity);
}

/**
 * Guarded decrement: only succeeds when the locked row still holds enough
 * stock. Returns the new balance, or null when stock is insufficient.
 */
async function decrementQuantGuarded(client, productId, locationId, quantity) {
  const { rows } = await client.query(
    `UPDATE stock_quants
        SET quantity = quantity - $3
      WHERE product_id = $1 AND location_id = $2 AND quantity >= $3
    RETURNING quantity`,
    [productId, locationId, quantity]
  );
  return rows[0] ? Number(rows[0].quantity) : null;
}

/** Absolute set (physical count reconciliation / adjustments). */
async function setQuant(client, productId, locationId, quantity) {
  const { rows } = await client.query(
    `INSERT INTO stock_quants (product_id, location_id, quantity)
     VALUES ($1, $2, $3)
     ON CONFLICT (product_id, location_id)
     DO UPDATE SET quantity = EXCLUDED.quantity
     RETURNING quantity`,
    [productId, locationId, quantity]
  );
  return Number(rows[0].quantity);
}

// ---------------------------------------------------------------------------
// Ledger + document helpers
// ---------------------------------------------------------------------------

/** Append one immutable double-entry ledger record. */
async function writeMove(client, { operationId, productId, sourceLocationId, destLocationId, quantity }) {
  const { rows } = await client.query(
    `INSERT INTO stock_moves (operation_id, product_id, source_location_id, dest_location_id, quantity)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, timestamp`,
    [operationId, productId, sourceLocationId, destLocationId, quantity]
  );
  return rows[0];
}

async function nextReference(client, type) {
  const sql = REFERENCE_SQL[type];
  if (!sql) throw new AppError(`Unsupported operation type "${type}".`);
  const { rows } = await client.query(sql);
  return rows[0].reference_no;
}

/**
 * Create a document header (status Draft) plus its line items.
 * @param {{type:string, partnerName?:string, userId?:number, lines:Array}} input
 */
async function createOperationDraft(client, { type, partnerName = null, userId = null, lines }) {
  if (!OPERATION_TYPES.includes(type)) throw new AppError(`Unsupported operation type "${type}".`);

  const referenceNo = await nextReference(client, type);
  const { rows: headerRows } = await client.query(
    `INSERT INTO operations (reference_no, type, status, partner_name, created_by)
     VALUES ($1, $2, 'Draft', $3, $4)
     RETURNING id, reference_no, type, status, partner_name, created_at`,
    [referenceNo, type, partnerName, userId]
  );
  const operation = headerRows[0];

  await insertOperationLines(client, operation.id, lines);
  return operation;
}

/** Bulk-insert line items (array parameters — fully parameterized). */
async function insertOperationLines(client, operationId, lines) {
  if (!lines.length) throw new AppError('At least one product line is required.');
  const { rows } = await client.query(
    `INSERT INTO operation_lines (operation_id, product_id, quantity, source_location_id, dest_location_id)
     SELECT $1, l.product_id, l.quantity, l.source_location_id, l.dest_location_id
       FROM unnest($2::int[], $3::numeric[], $4::int[], $5::int[])
            AS l(product_id, quantity, source_location_id, dest_location_id)
     RETURNING id, product_id, quantity, source_location_id, dest_location_id`,
    [
      operationId,
      lines.map((l) => l.productId),
      lines.map((l) => l.quantity),
      lines.map((l) => l.sourceLocationId ?? null),
      lines.map((l) => l.destLocationId ?? null),
    ]
  );
  return rows;
}

/** Load line items with product/location display data. */
async function loadLines(client, operationId) {
  const { rows } = await client.query(
    `SELECT ol.id,
            ol.product_id,
            ol.quantity,
            ol.source_location_id,
            ol.dest_location_id,
            p.name AS product_name,
            p.sku,
            p.uom,
            sl.name AS source_location_name,
            dl.name AS dest_location_name
       FROM operation_lines ol
       JOIN products p ON p.id = ol.product_id
       LEFT JOIN locations sl ON sl.id = ol.source_location_id
       LEFT JOIN locations dl ON dl.id = ol.dest_location_id
      WHERE ol.operation_id = $1
      ORDER BY ol.id`,
    [operationId]
  );
  return rows;
}

/**
 * Lock the document row and assert it is in a valid pre-posting state.
 * This is what makes concurrent "Validate" clicks safe: the first
 * transaction flips the status to Done (committing the ledger), the
 * second one blocks on the row lock and then reads status = Done.
 */
async function claimForPosting(client, operationId, expectedType) {
  const { rows } = await client.query(
    `SELECT id, reference_no, type, status
       FROM operations
      WHERE id = $1
      FOR UPDATE`,
    [operationId]
  );
  const op = rows[0];
  if (!op) throw new AppError('Operation not found.', 404);
  if (expectedType && op.type !== expectedType) {
    throw new AppError(`Operation ${op.reference_no} is a ${op.type}, not a ${expectedType}.`);
  }
  if (op.status === 'Done') throw new AppError(`${op.reference_no} was already validated.`, 409);
  if (op.status === 'Canceled') throw new AppError(`${op.reference_no} was canceled and cannot be validated.`, 409);
  if (op.status !== 'Ready') {
    throw new AppError(
      `${op.reference_no} must be moved to "Ready" before validation (current status: ${op.status}).`
    );
  }
  return op;
}

async function markDone(client, operationId) {
  const { rows } = await client.query(
    `UPDATE operations SET status = 'Done' WHERE id = $1
     RETURNING id, reference_no, type, status, partner_name, created_at`,
    [operationId]
  );
  return rows[0];
}

/**
 * Advance a document along Draft -> Waiting -> Ready (or Cancel).
 * Single conditional UPDATE — no interleaving state can slip through.
 */
async function advanceStatus({ operationId, targetStatus, user }) {
  assertStaffOrManager(user);
  if (targetStatus === 'Done') {
    throw new AppError('Documents move to Done only through validation.');
  }
  if (targetStatus === 'Canceled' && user.role !== 'manager') {
    throw new AppError('Only an Inventory Manager can cancel a document.', 403);
  }
  return runInTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT id, reference_no, type, status FROM operations WHERE id = $1 FOR UPDATE`,
      [operationId]
    );
    const op = rows[0];
    if (!op) throw new AppError('Operation not found.', 404);
    const allowed = STATUS_TRANSITIONS[op.status] || [];
    if (!allowed.includes(targetStatus)) {
      throw new AppError(
        `${op.reference_no} cannot move from ${op.status} to ${targetStatus}.`
      );
    }
    const updated = await client.query(
      `UPDATE operations SET status = $2 WHERE id = $1
       RETURNING id, reference_no, type, status`,
      [operationId, targetStatus]
    );
    return updated.rows[0];
  });
}

// ---------------------------------------------------------------------------
// Queries used by the UI layer
// ---------------------------------------------------------------------------

async function listOperations({ type, status = null, limit = 50 } = {}) {
  const { rows } = await query(
    `SELECT o.id,
            o.reference_no,
            o.type,
            o.status,
            o.partner_name,
            o.created_at,
            u.name AS created_by_name,
            COUNT(ol.id)::int AS line_count,
            COALESCE(SUM(ol.quantity), 0)::numeric AS total_quantity
       FROM operations o
       LEFT JOIN users u ON u.id = o.created_by
       LEFT JOIN operation_lines ol ON ol.operation_id = o.id
      WHERE ($1::text IS NULL OR o.type = $1)
        AND ($2::text IS NULL OR o.status = $2)
      GROUP BY o.id, u.name
      ORDER BY o.id DESC
      LIMIT $3`,
    [type, status, limit]
  );
  return rows;
}

async function getOperationDetail(operationId) {
  const header = await query(
    `SELECT o.id, o.reference_no, o.type, o.status, o.partner_name, o.created_at,
            u.name AS created_by_name
       FROM operations o
       LEFT JOIN users u ON u.id = o.created_by
      WHERE o.id = $1`,
    [operationId]
  );
  if (!header.rows[0]) return null;
  const lines = await query(
    `SELECT ol.id, ol.quantity,
            p.id AS product_id, p.name AS product_name, p.sku, p.uom,
            sl.name AS source_location_name,
            dl.name AS dest_location_name
       FROM operation_lines ol
       JOIN products p ON p.id = ol.product_id
       LEFT JOIN locations sl ON sl.id = ol.source_location_id
       LEFT JOIN locations dl ON dl.id = ol.dest_location_id
      WHERE ol.operation_id = $1
      ORDER BY ol.id`,
    [operationId]
  );
  return { ...header.rows[0], lines: lines.rows };
}

module.exports = {
  OPERATION_TYPES,
  TYPE_LABELS,
  STATUS_TRANSITIONS,
  InsufficientStockError,
  assertManager,
  assertStaffOrManager,
  systemLocationId,
  getLocation,
  assertInternalLocation,
  validateProductsExist,
  lockQuantRows,
  incrementQuant,
  decrementQuantGuarded,
  setQuant,
  writeMove,
  nextReference,
  createOperationDraft,
  insertOperationLines,
  loadLines,
  claimForPosting,
  markDone,
  advanceStatus,
  listOperations,
  getOperationDetail,
};
