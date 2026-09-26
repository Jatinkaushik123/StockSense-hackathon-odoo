import transferEngine from '../../../../modules/engine/transferEngine.js';
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
    let destLocationId = body.destLocationId ? Number(body.destLocationId) : null;
    if (!sourceLocationId || !destLocationId) {
      const internals = await locations.listInternalLocations();
      if (internals.length >= 2) {
        sourceLocationId = sourceLocationId || internals[0].id;
        destLocationId = destLocationId || internals[1].id;
      }
    }

    const input = parseOrThrow(schemas.transferCreateSchema, {
      sourceLocationId,
      destLocationId,
      lines: (body.lines || body.items || []).map((l) => ({
        productId: Number(l.productId || l.id),
        quantity: Number(l.quantity || 1),
      })),
    });

    const operation = await transferEngine.createTransfer({ ...input, user });
    return jsonResponse({
      ok: true,
      operation,
      message: `${operation.reference_no} created as Draft.`,
    }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
