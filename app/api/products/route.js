import catalog from '../../../modules/products/catalog.js';
import stock from '../../../modules/products/stock.js';
import { jsonResponse, corsOptionsResponse, parseBody, handleApiError, requireUser } from '../_lib/apiHelper.js';
import sanitizeModule from '../../../modules/security/sanitize.js';

const { schemas, parseOrThrow } = sanitizeModule;

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || null;
    const products = await stock.productTotals({ search, limit: 300 });
    return jsonResponse({ ok: true, products });
  } catch (err) {
    return handleApiError(err);
  }
}

import { query } from '../../../db/custom-client.js';

export async function POST(request) {
  try {
    await requireUser({ minRole: 'staff' });
    const body = await parseBody(request);
    const input = parseOrThrow(schemas.productSchema, {
      name: body.name,
      sku: body.sku,
      category: body.category,
      uom: body.uom,
      minStockAlert: Number(body.minStockAlert ?? body.minStock ?? 10),
    });
    const product = await catalog.createProduct(input);

    const initialQty = Number(body.initialStock ?? body.currentStock ?? 0);
    if (initialQty > 0) {
      try {
        const locRes = await query(
          `SELECT id FROM locations WHERE name = $1 OR type = 'internal' ORDER BY (name = 'Main Store') DESC LIMIT 1`,
          [body.location || 'Main Store']
        );
        if (locRes.rows.length) {
          await query(
            `INSERT INTO stock_quants (product_id, location_id, quantity)
             VALUES ($1, $2, $3)
             ON CONFLICT (product_id, location_id) DO UPDATE SET quantity = stock_quants.quantity + EXCLUDED.quantity`,
            [product.id, locRes.rows[0].id, initialQty]
          );
        }
      } catch (quantErr) {
        console.warn('[products] Initial quant creation warning:', quantErr.message);
      }
    }

    return jsonResponse({ ok: true, product, message: `Product "${product.name}" created.` }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
