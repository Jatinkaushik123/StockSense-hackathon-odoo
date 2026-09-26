/**
 * modules/products/catalog.js
 * ------------------------------------------------------------------
 * Product master data (Name, SKU, Category, UOM, Minimum Alert).
 * Plain parameterized SQL — no ORM, no query builder.
 */
const { query } = require('../../db/custom-client.js');
const { AppError, translatePgError } = require('../security/errorHandler.js');

/** List products with on-hand balance across internal locations. */
async function listProducts({ search = null, limit = 200 } = {}) {
  const { rows } = await query(
    `SELECT p.id, p.name, p.sku, p.category, p.uom, p.min_stock_alert, p.created_at,
            COALESCE(SUM(CASE WHEN l.type = 'internal' THEN sq.quantity ELSE 0 END), 0)::numeric AS on_hand
       FROM products p
       LEFT JOIN stock_quants sq ON sq.product_id = p.id
       LEFT JOIN locations l ON l.id = sq.location_id
      WHERE ($1::text IS NULL
             OR p.name ILIKE '%' || $1 || '%'
             OR p.sku ILIKE '%' || $1 || '%'
             OR p.category ILIKE '%' || $1 || '%')
      GROUP BY p.id
      ORDER BY p.name ASC
      LIMIT $2`,
    [search, limit]
  );
  return rows;
}

async function getProduct(id) {
  const { rows } = await query(
    `SELECT id, name, sku, category, uom, min_stock_alert, created_at
       FROM products WHERE id = $1`,
    [id]
  );
  if (!rows[0]) throw new AppError('Product not found.', 404);
  return rows[0];
}

async function createProduct({ name, sku, category, uom, minStockAlert }) {
  try {
    const { rows } = await query(
      `INSERT INTO products (name, sku, category, uom, min_stock_alert)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, sku, category, uom, min_stock_alert`,
      [name, sku, category, uom, minStockAlert]
    );
    return rows[0];
  } catch (err) {
    const friendly = translatePgError(err);
    if (friendly) throw friendly;
    throw err;
  }
}

/**
 * Partial update via COALESCE — one static statement covers every
 * field combination with zero dynamic SQL assembly.
 */
async function updateProduct(id, { name, sku, category, uom, minStockAlert }) {
  const { rows } = await query(
    `UPDATE products
        SET name            = COALESCE($2, name),
            sku             = COALESCE($3, sku),
            category        = COALESCE($4, category),
            uom             = COALESCE($5, uom),
            min_stock_alert = COALESCE($6, min_stock_alert)
      WHERE id = $1
      RETURNING id, name, sku, category, uom, min_stock_alert`,
    [
      id,
      name ?? null,
      sku ?? null,
      category ?? null,
      uom ?? null,
      minStockAlert ?? null,
    ]
  );
  if (!rows[0]) throw new AppError('Product not found.', 404);
  return rows[0];
}

/**
 * Delete a product. The ledger is immutable, so products that already
 * have stock moves or non-zero balances are protected.
 */
async function deleteProduct(id) {
  const ledger = await query(
    `SELECT 1 FROM stock_moves WHERE product_id = $1 LIMIT 1`,
    [id]
  );
  if (ledger.rows.length) {
    throw new AppError(
      'This product already has ledger history and cannot be deleted — keep it for auditability and adjust its stock to zero instead.',
      409
    );
  }
  const balance = await query(
    `SELECT COALESCE(SUM(quantity), 0)::numeric AS total FROM stock_quants WHERE product_id = $1`,
    [id]
  );
  if (Number(balance.rows[0].total) !== 0) {
    throw new AppError('This product still holds stock. Move it to zero first.', 409);
  }
  const { rowCount } = await query(`DELETE FROM products WHERE id = $1`, [id]);
  if (!rowCount) throw new AppError('Product not found.', 404);
  return { id, deleted: true };
}

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct };
