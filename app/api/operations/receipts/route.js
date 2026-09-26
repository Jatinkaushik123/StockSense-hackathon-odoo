import receiptEngine from '../../../../modules/engine/receiptEngine.js';
import locations from '../../../../modules/products/locations.js';
import { jsonResponse, corsOptionsResponse, parseBody, handleApiError, requireUser } from '../../_lib/apiHelper.js';
import sanitizeModule from '../../../../modules/security/sanitize.js';

const { schemas, parseOrThrow } = sanitizeModule;

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function POST(request) {
  try {
    const user = await requireUser({ minRole: 'staff' });
    const body = await parseBody(request);

    let destLocationId = body.destLocationId ? Number(body.destLocationId) : null;
    if (!destLocationId) {
      const internals = await locations.listInternalLocations();
      if (internals.length) destLocationId = internals[0].id;
    }

    const input = parseOrThrow(schemas.receiptCreateSchema, {
      partnerName: body.partnerName || body.partner || 'Vendor ABC Logistics Inc.',
      destLocationId,
      lines: (body.lines || body.items || []).map((l) => ({
        productId: Number(l.productId || l.id),
        quantity: Number(l.quantity || l.expectedQty || l.receivedQty || 1),
      })),
    });

    const operation = await receiptEngine.createReceipt({ ...input, user });
    return jsonResponse({
      ok: true,
      operation,
      message: `${operation.reference_no} created as Draft.`,
    }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
