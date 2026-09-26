/**
 * modules/products/stock.js
 * ------------------------------------------------------------------
 * Real-time stock level queries over stock_quants (the balance cache
 * that every posting engine keeps in lock-step with stock_moves).
 */
const { query } = require('../../db/custom-client.js');

/**
 * Stock levels per product × location.
 * @param {{productId?:number, locationId?:number, search?:string, internalOnly?:boolean}} filters
 */
async function stockByLocation({
  productId = null,
  locationId = null,
  search = null,
  internalOnly = true,
} = {}) {
  const { rows } = await query(
    `SELECT sq.id,
            sq.quantity,
            p.id AS product_id, p.name AS product_name, p.sku, p.uom, p.category,
            p.min_stock_alert,
            l.id AS location_id, l.name AS location_name, l.warehouse_name, l.type AS location_type
       FROM stock_quants sq
       JOIN products p ON p.id = sq.product_id
       JOIN locations l ON l.id = sq.location_id
      WHERE ($1::int IS NULL OR sq.product_id = $1)
        AND ($2::int IS NULL OR sq.location_id = $2)
        AND ($3::text IS NULL OR p.name ILIKE '%' || $3 || '%' OR p.sku ILIKE '%' || $3 || '%')
        AND ($4::boolean IS FALSE OR l.type = 'internal')
      ORDER BY l.type ASC, l.name ASC, p.name ASC
      LIMIT 400`,
    [productId, locationId, search, internalOnly]
  );
  return rows;
}

/** On-hand totals per product plus low-stock classification. */
async function productTotals({ search = null, limit = 300 } = {}) {
  const { rows } = await query(
    `SELECT p.id, p.name, p.sku, p.category, p.uom, p.min_stock_alert,
            COALESCE(SUM(CASE WHEN l.type = 'internal' THEN sq.quantity ELSE 0 END), 0)::numeric AS on_hand
       FROM products p
       LEFT JOIN stock_quants sq ON sq.product_id = p.id
       LEFT JOIN locations l ON l.id = sq.location_id
      WHERE ($1::text IS NULL OR p.name ILIKE '%' || $1 || '%' OR p.sku ILIKE '%' || $1 || '%')
      GROUP BY p.id
      ORDER BY p.name ASC
      LIMIT $2`,
    [search, limit]
  );
  return rows.map((row) => ({
    ...row,
    onHand: Number(row.on_hand),
    isOutOfStock: Number(row.on_hand) === 0,
    isLowStock: Number(row.on_hand) > 0 && Number(row.on_hand) <= row.min_stock_alert,
  }));
}

/** Zone summary: units + distinct products per location. */
async function locationSummary({ internalOnly = true } = {}) {
  const { rows } = await query(
    `SELECT l.id, l.name, l.warehouse_name, l.type,
            COUNT(DISTINCT sq.product_id)::int AS product_count,
            COALESCE(SUM(sq.quantity), 0)::numeric AS total_units
       FROM locations l
       LEFT JOIN stock_quants sq ON sq.location_id = l.id
      WHERE ($1::boolean IS FALSE OR l.type = 'internal')
      GROUP BY l.id
      ORDER BY l.name ASC`,
    [internalOnly]
  );
  return rows;
}

module.exports = { stockByLocation, productTotals, locationSummary };
