/**
 * modules/products/locations.js
 * ------------------------------------------------------------------
 * Warehouse & Location catalog.
 * Physical zones:  Warehouse 1, Main Store, Production Floor, Rack A/B
 * Virtual parties: Vendors (vendor), Customers (customer),
 *                  Scrap/Loss (inventory_loss)
 */
const { query } = require('../../db/custom-client.js');
const { AppError, translatePgError } = require('../security/errorHandler.js');

const TYPE_LABELS = {
  internal: 'Internal Zone',
  vendor: 'Vendor (virtual)',
  customer: 'Customer (virtual)',
  inventory_loss: 'Scrap/Loss (virtual)',
};

/** All locations, optionally filtered by type. */
async function listLocations({ type = null, limit = 200 } = {}) {
  const { rows } = await query(
    `SELECT id, name, warehouse_name, type, created_at
       FROM locations
      WHERE ($1::text IS NULL OR type = $1)
      ORDER BY
        CASE type
          WHEN 'internal' THEN 0
          WHEN 'vendor' THEN 1
          WHEN 'customer' THEN 2
          ELSE 3
        END,
        name ASC
      LIMIT $2`,
    [type, limit]
  );
  return rows;
}

/** Physical stock locations only (movable zones). */
function listInternalLocations() {
  return listLocations({ type: 'internal' });
}

async function getLocation(id) {
  const { rows } = await query(
    `SELECT id, name, warehouse_name, type FROM locations WHERE id = $1`,
    [id]
  );
  if (!rows[0]) throw new AppError('Location not found.', 404);
  return rows[0];
}

/** Resolve one system virtual location (vendor/customer/inventory_loss). */
async function getSystemLocation(type) {
  const { rows } = await query(
    `SELECT id, name, type FROM locations WHERE type = $1 ORDER BY id LIMIT 1`,
    [type]
  );
  if (!rows[0]) throw new AppError(`System location "${type}" is missing. Re-run the seed.`, 500);
  return rows[0];
}

async function createLocation({ name, warehouseName, type }) {
  try {
    const { rows } = await query(
      `INSERT INTO locations (name, warehouse_name, type)
       VALUES ($1, $2, $3)
       RETURNING id, name, warehouse_name, type`,
      [name, warehouseName, type]
    );
    return rows[0];
  } catch (err) {
    const friendly = translatePgError(err);
    if (friendly) throw friendly;
    throw err;
  }
}

module.exports = {
  TYPE_LABELS,
  listLocations,
  listInternalLocations,
  getLocation,
  getSystemLocation,
  createLocation,
};
