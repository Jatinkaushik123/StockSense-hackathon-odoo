import engineShared from '../../../../../modules/engine/shared.js';
import { jsonResponse, corsOptionsResponse, parseBody, handleApiError, requireUser } from '../../../_lib/apiHelper.js';
import { query } from '../../../../../db/custom-client.js';

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function POST(request, { params }) {
  try {
    const user = await requireUser({ minRole: 'staff' });
    const { id: rawId } = await params;
    let operationId = Number(rawId);

    if (!Number.isInteger(operationId) || operationId <= 0) {
      const { rows } = await query(
        `SELECT id FROM operations WHERE reference_no = $1 LIMIT 1`,
        [rawId]
      );
      if (rows[0]) operationId = rows[0].id;
    }

    const body = await parseBody(request);
    const targetStatus = body.targetStatus || body.status;

    const operation = await engineShared.advanceStatus({
      operationId,
      targetStatus,
      user,
    });

    return jsonResponse({
      ok: true,
      operation,
      message: `${operation.reference_no} advanced to ${targetStatus}.`,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
