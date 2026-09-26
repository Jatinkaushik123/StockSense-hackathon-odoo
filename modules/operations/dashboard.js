/**
 * modules/operations/dashboard.js
 * ------------------------------------------------------------------
 * Dashboard KPI aggregates (parameterized SQL, no ORM):
 *  - Total products in stock / total units on hand
 *  - Low stock + out of stock (on_hand <= min_stock_alert)
 *  - Pending receipts & deliveries (status IN Draft, Waiting)
 *  - Scheduled internal transfers + pending adjustments
 *  - Moves posted today + latest ledger activity
 */
const { query } = require('../../db/custom-client.js');

async function inventoryTotals() {
  const { rows } = await query(
    `SELECT
       COUNT(DISTINCT CASE WHEN sq.quantity > 0 THEN sq.product_id END)::int AS products_in_stock,
       COALESCE(SUM(sq.quantity), 0)::numeric AS total_units
     FROM stock_quants sq
     JOIN locations l ON l.id = sq.location_id
    WHERE l.type = 'internal'`
  );
  const skus = await query(`SELECT COUNT(*)::int AS total_skus FROM products`);
  return {
    productsInStock: rows[0].products_in_stock,
    totalUnits: Number(rows[0].total_units),
    totalSkus: skus.rows[0].total_skus,
  };
}

/** Products at or below their minimum alert threshold (includes zero). */
async function lowStockItems({ limit = 15 } = {}) {
  const { rows } = await query(
    `SELECT p.id, p.name, p.sku, p.uom, p.category, p.min_stock_alert,
            COALESCE(SUM(CASE WHEN l.type = 'internal' THEN sq.quantity ELSE 0 END), 0)::numeric AS on_hand
       FROM products p
       LEFT JOIN stock_quants sq ON sq.product_id = p.id
       LEFT JOIN locations l ON l.id = sq.location_id
      GROUP BY p.id
     HAVING COALESCE(SUM(CASE WHEN l.type = 'internal' THEN sq.quantity ELSE 0 END), 0) <= p.min_stock_alert
      ORDER BY on_hand ASC, p.name ASC
      LIMIT $1`,
    [limit]
  );
  return rows.map((row) => ({
    ...row,
    onHand: Number(row.on_hand),
    isOutOfStock: Number(row.on_hand) === 0,
  }));
}

/** Document counts grouped by type/status in one round-trip. */
async function pendingDocumentCounts() {
  const { rows } = await query(
    `SELECT type, status, COUNT(*)::int AS count
       FROM operations
      WHERE status IN ('Draft', 'Waiting', 'Ready')
      GROUP BY type, status`
  );
  const pick = (type, statuses) =>
    rows
      .filter((r) => r.type === type && statuses.includes(r.status))
      .reduce((sum, r) => sum + r.count, 0);

  return {
    pendingReceipts: pick('receipt', ['Draft', 'Waiting']),
    pendingDeliveries: pick('delivery', ['Draft', 'Waiting']),
    scheduledTransfers: pick('internal', ['Draft', 'Waiting', 'Ready']),
    pendingAdjustments: pick('adjustment', ['Draft', 'Waiting', 'Ready']),
  };
}

async function activityStats() {
  const { rows } = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM stock_moves WHERE timestamp >= CURRENT_DATE) AS moves_today,
       (SELECT COUNT(*)::int FROM stock_moves) AS moves_total,
       (SELECT COUNT(*)::int FROM locations WHERE type = 'internal') AS internal_locations`
  );
  return {
    movesToday: rows[0].moves_today,
    movesTotal: rows[0].moves_total,
    internalLocations: rows[0].internal_locations,
  };
}

/** Latest ledger entries for the dashboard activity feed. */
async function recentMoves({ limit = 6 } = {}) {
  const { rows } = await query(
    `SELECT sm.id, sm.quantity, sm.timestamp,
            p.name AS product_name, p.sku, p.uom,
            sl.name AS source_location, dl.name AS dest_location,
            o.reference_no, o.type AS operation_type
       FROM stock_moves sm
       JOIN products p ON p.id = sm.product_id
       JOIN locations sl ON sl.id = sm.source_location_id
       JOIN locations dl ON dl.id = sm.dest_location_id
       LEFT JOIN operations o ON o.id = sm.operation_id
      ORDER BY sm.timestamp DESC, sm.id DESC
      LIMIT $1`,
    [limit]
  );
  return rows.map((row) => ({ ...row, quantity: Number(row.quantity) }));
}

/** Everything the dashboard needs, fetched concurrently. */
async function getDashboardKpis() {
  const [totals, lowStock, pending, activity, recent] = await Promise.all([
    inventoryTotals(),
    lowStockItems(),
    pendingDocumentCounts(),
    activityStats(),
    recentMoves(),
  ]);
  return { ...totals, ...pending, ...activity, lowStock, recentMoves: recent };
}

module.exports = {
  getDashboardKpis,
  inventoryTotals,
  lowStockItems,
  pendingDocumentCounts,
  activityStats,
  recentMoves,
};
