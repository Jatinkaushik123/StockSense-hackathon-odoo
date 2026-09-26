import adjustmentEngine from '../../../../modules/engine/adjustmentEngine.js';
import locations from '../../../../modules/products/locations.js';
import { jsonResponse, corsOptionsResponse, parseBody, handleApiError, requireUser } from '../../_lib/apiHelper.js';
import sanitizeModule from '../../../../modules/security/sanitize.js';

const { schemas, parseOrThrow } = sanitizeModule;

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function POST(request) {
  try {
    const user = await requireUser({ minRole: 'manager' });
    const body = await parseBody(request);

    let locationId = body.locationId ? Number(body.locationId) : null;
    if (!locationId) {
      const internals = await locations.listInternalLocations();
      if (internals.length) locationId = internals[0].id;
    }

    const lines = (body.lines || []).map((l) => ({
      productId: Number(l.productId || l.id),
      countedQty: Number(l.countedQty !== undefined ? l.countedQty : l.physicalCount !== undefined ? l.physicalCount : 0),
    }));

    if (body.productId && body.physicalCount !== undefined) {
      lines.push({
        productId: Number(body.productId),
        countedQty: Number(body.physicalCount),
      });
    }

    const input = parseOrThrow(schemas.adjustmentCreateSchema, {
      locationId,
      lines,
    });

    const operation = await adjustmentEngine.createAdjustment({ ...input, user });
    
    // Transition Draft -> Waiting -> Ready to satisfy state machine before posting
    const engineShared = await import('../../../../modules/engine/shared.js').then((m) => m.default || m);
    await engineShared.advanceStatus({ operationId: operation.id, targetStatus: 'Waiting', user });
    await engineShared.advanceStatus({ operationId: operation.id, targetStatus: 'Ready', user });

    // Automatically validate the adjustment so physical count reconciles immediately
    const validation = await adjustmentEngine.validateAdjustment({
      operationId: operation.id,
      user,
    });

    return jsonResponse({
      ok: true,
      operation: validation.operation,
      movements: validation.movements,
      message: `${validation.operation.reference_no} reconciled: ${validation.movements} compensating ledger move(s) posted.`,
    }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
