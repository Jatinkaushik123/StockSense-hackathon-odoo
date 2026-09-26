import { query } from '../../../../../db/custom-client.js';
import receiptEngine from '../../../../../modules/engine/receiptEngine.js';
import deliveryEngine from '../../../../../modules/engine/deliveryEngine.js';
import transferEngine from '../../../../../modules/engine/transferEngine.js';
import adjustmentEngine from '../../../../../modules/engine/adjustmentEngine.js';
import { jsonResponse, corsOptionsResponse, handleApiError, requireUser } from '../../../_lib/apiHelper.js';

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function POST(_request, { params }) {
  try {
    const user = await requireUser({ minRole: 'manager' });
    const { id: rawId } = await params;
    let operationId = Number(rawId);

    if (!Number.isInteger(operationId) || operationId <= 0) {
      const { rows } = await query(
        `SELECT id FROM operations WHERE reference_no = $1 LIMIT 1`,
        [rawId]
      );
      if (rows[0]) operationId = rows[0].id;
    }

    const { rows: opRows } = await query(
      `SELECT id, type, reference_no, status FROM operations WHERE id = $1`,
      [operationId]
    );

    if (!opRows[0]) {
      return jsonResponse({ ok: false, error: 'Operation not found.' }, 404);
    }

    const op = opRows[0];
    let result;

    switch (op.type) {
      case 'receipt':
        result = await receiptEngine.validateReceipt({ operationId, user });
        return jsonResponse({
          ok: true,
          message: `${op.reference_no} validated: ${result.totalUnits} unit(s) received into stock.`,
          result,
        });

      case 'delivery':
        result = await deliveryEngine.validateDelivery({ operationId, user });
        return jsonResponse({
          ok: true,
          message: `${op.reference_no} dispatched: ${result.totalUnits} unit(s) deducted from stock.`,
          result,
        });

      case 'internal':
        result = await transferEngine.validateTransfer({ operationId, user });
        return jsonResponse({
          ok: true,
          message: `${op.reference_no} executed: ${result.totalUnits} unit(s) moved between zones.`,
          result,
        });

      case 'adjustment':
        result = await adjustmentEngine.validateAdjustment({ operationId, user });
        return jsonResponse({
          ok: true,
          message: `${op.reference_no} reconciled: ${result.movements} compensating move(s) posted.`,
          result,
        });

      default:
        return jsonResponse({ ok: false, error: `Unknown operation type: ${op.type}` }, 400);
    }
  } catch (err) {
    return handleApiError(err);
  }
}
