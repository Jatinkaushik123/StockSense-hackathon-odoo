/**
 * modules/operations/moveHistory.js
 * ------------------------------------------------------------------
 * Immutable Stock Move History audit log.
 * Joins stock_moves + products + source/destination locations +
 * operations + users (creator). Fully parameterized — optional filters
 * use static SQL with nullable parameters (never string-built SQL).
 */
const { query } = require('../../db/custom-client.js');

const MAX_PAGE_SIZE = 100;

/**
 * @param {{page?:number, pageSize?:number, search?:string, type?:string,
 *          productId?:number, locationId?:number, from?:string, to?:string}} filters
 */
async function listMoves({
  page = 0,
  pageSize = 20,
  search = null,
  type = null,
  productId = null,
  locationId = null,
  from = null,
  to = null,
} = {}) {
  const safePage = Math.max(0, Number(page) || 0);
  const safeSize = Math.min(MAX_PAGE_SIZE, Math.max(5, Number(pageSize) || 20));
  const offset = safePage * safeSize;

  const { rows } = await query(
    `SELECT sm.id,
            sm.quantity,
            sm.timestamp,
            p.id   AS product_id,
            p.name AS product_name,
            p.sku,
            p.uom,
            sl.id   AS source_location_id,
            sl.name AS source_location,
            dl.id   AS dest_location_id,
            dl.name AS dest_location,
            o.id   AS operation_id,
            o.reference_no,
            o.type   AS operation_type,
            o.status AS operation_status,
            u.name AS responsible,
            COUNT(*) OVER()::int AS total_count
       FROM stock_moves sm
       JOIN products p ON p.id = sm.product_id
       JOIN locations sl ON sl.id = sm.source_location_id
       JOIN locations dl ON dl.id = sm.dest_location_id
       LEFT JOIN operations o ON o.id = sm.operation_id
       LEFT JOIN users u ON u.id = o.created_by
      WHERE ($1::text IS NULL
             OR p.name ILIKE '%' || $1 || '%'
             OR p.sku ILIKE '%' || $1 || '%'
             OR o.reference_no ILIKE '%' || $1 || '%')
        AND ($2::text IS NULL OR o.type = $2)
        AND ($3::int IS NULL OR sm.product_id = $3)
        AND ($4::int IS NULL OR sm.source_location_id = $4 OR sm.dest_location_id = $4)
        AND ($5::timestamptz IS NULL OR sm.timestamp >= $5)
        AND ($6::timestamptz IS NULL OR sm.timestamp <= $6)
      ORDER BY sm.timestamp DESC, sm.id DESC
      LIMIT $7 OFFSET $8`,
    [search, type, productId, locationId, from, to, safeSize, offset]
  );

  const total = rows.length ? rows[0].total_count : 0;
  const moves = rows.map((row) => ({ ...row, quantity: Number(row.quantity) }));

  return {
    moves,
    page: safePage,
    pageSize: safeSize,
    total,
    pageCount: Math.max(1, Math.ceil(total / safeSize)),
  };
}

/** Aggregate counters for the history header. */
async function moveStats() {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS total_moves,
            COALESCE(SUM(quantity), 0)::numeric AS total_units,
            COUNT(*) FILTER (WHERE timestamp >= CURRENT_DATE)::int AS moves_today
       FROM stock_moves`
  );
  return {
    totalMoves: rows[0].total_moves,
    totalUnits: Number(rows[0].total_units),
    movesToday: rows[0].moves_today,
  };
}

module.exports = { listMoves, moveStats, MAX_PAGE_SIZE };
