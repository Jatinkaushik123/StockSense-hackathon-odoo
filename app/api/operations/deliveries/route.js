import deliveryEngine from '../../../../modules/engine/deliveryEngine.js';
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

    let sourceLocationId = body.sourceLocationId ? Number(body.sourceLocationId) : null;
    if (!sourceLocationId) {
      const internals = await locations.listInternalLocations();
      if (internals.length) sourceLocationId = internals[0].id;
    }

    const input = parseOrThrow(schemas.deliveryCreateSchema, {
      partnerName: body.partnerName || body.partner || 'Customer XYZ Corp',
      sourceLocationId,
      lines: (body.lines || body.items || []).map((l) => ({
        productId: Number(l.productId || l.id),
        quantity: Number(l.quantity || l.expectedQty || 1),
      })),
    });

    const operation = await deliveryEngine.createDelivery({ ...input, user });
    return jsonResponse({
      ok: true,
      operation,
      message: `${operation.reference_no} created as Draft.`,
    }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
