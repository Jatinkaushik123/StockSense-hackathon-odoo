import catalog from '../../../../../modules/products/catalog.js';
import { jsonResponse, corsOptionsResponse, parseBody, handleApiError, requireUser } from '../../_lib/apiHelper.js';
import sanitizeModule from '../../../../../modules/security/sanitize.js';

const { schemas, parseOrThrow } = sanitizeModule;

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const product = await catalog.getProduct(Number(id));
    return jsonResponse({ ok: true, product });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(request, { params }) {
  try {
    await requireUser({ minRole: 'manager' });
    const { id } = await params;
    const body = await parseBody(request);
    const candidate = {
      name: body.name,
      sku: body.sku,
      category: body.category,
      uom: body.uom,
      minStockAlert: body.minStockAlert !== undefined ? Number(body.minStockAlert) : undefined,
    };
    const patch = Object.fromEntries(
      Object.entries(candidate).filter(([, val]) => val !== undefined)
    );
    const input = parseOrThrow(schemas.productUpdateSchema, patch);
    const updated = await catalog.updateProduct(Number(id), input);
    return jsonResponse({ ok: true, product: updated });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(_request, { params }) {
  try {
    await requireUser({ minRole: 'manager' });
    const { id } = await params;
    await catalog.deleteProduct(Number(id));
    return jsonResponse({ ok: true, message: 'Product deleted.' });
  } catch (err) {
    return handleApiError(err);
  }
}
