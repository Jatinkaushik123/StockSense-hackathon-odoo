import engineShared from '../../../../modules/engine/shared.js';
import { jsonResponse, corsOptionsResponse, handleApiError } from '../../_lib/apiHelper.js';
import { query } from '../../../../db/custom-client.js';

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(_request, { params }) {
  try {
    const { id: rawId } = await params;
    let operationId = Number(rawId);

    // If param is a reference_no (e.g. REC-2026-0084 or REC-0001)
    if (!Number.isInteger(operationId) || operationId <= 0) {
      const { rows } = await query(
        `SELECT id FROM operations WHERE reference_no = $1 LIMIT 1`,
        [rawId]
      );
      if (rows[0]) operationId = rows[0].id;
    }

    const detail = await engineShared.getOperationDetail(operationId);
    if (!detail) {
      return jsonResponse({ ok: false, error: 'Operation not found.' }, 404);
    }

    return jsonResponse({ ok: true, operation: detail });
  } catch (err) {
    return handleApiError(err);
  }
}
