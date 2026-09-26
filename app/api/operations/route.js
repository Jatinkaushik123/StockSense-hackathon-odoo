import { query } from '../../../db/custom-client.js';
import { jsonResponse, corsOptionsResponse, handleApiError } from '../_lib/apiHelper.js';

export async function OPTIONS() {
  return corsOptionsResponse();
}

const TYPE_MAP = {
  receipt: 'Receipt',
  delivery: 'Delivery',
  internal: 'Transfer',
  adjustment: 'Adjustment',
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    let type = searchParams.get('type') || null;
    if (type === 'Transfer') type = 'internal';
    else if (type) type = type.toLowerCase();

    const status = searchParams.get('status') || null;
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit')) || 100));

    const { rows: ops } = await query(
      `SELECT o.id, o.reference_no, o.type, o.status, o.partner_name, o.created_at,
              u.name AS created_by_name
         FROM operations o
         LEFT JOIN users u ON u.id = o.created_by
        WHERE ($1::text IS NULL OR o.type = $1)
          AND ($2::text IS NULL OR o.status = $2)
        ORDER BY o.id DESC
        LIMIT $3`,
      [type, status, limit]
    );

    if (ops.length === 0) {
      return jsonResponse({ ok: true, operations: [] });
    }

    const opIds = ops.map((o) => o.id);
    const { rows: lines } = await query(
      `SELECT ol.id, ol.operation_id, ol.quantity,
              p.id AS product_id, p.name AS product_name, p.sku, p.uom,
              sl.name AS source_location_name,
              dl.name AS dest_location_name
         FROM operation_lines ol
         JOIN products p ON p.id = ol.product_id
         LEFT JOIN locations sl ON sl.id = ol.source_location_id
         LEFT JOIN locations dl ON dl.id = ol.dest_location_id
        WHERE ol.operation_id = ANY($1)
        ORDER BY ol.id`,
      [opIds]
    );

    const linesByOp = {};
    for (const line of lines) {
      if (!linesByOp[line.operation_id]) linesByOp[line.operation_id] = [];
      linesByOp[line.operation_id].push({
        id: `line-${line.id}`,
        productId: String(line.product_id),
        name: line.product_name,
        sku: line.sku,
        expectedQty: Number(line.quantity),
        receivedQty: Number(line.quantity),
        variance: 0,
        unitCost: 20.0,
        uom: line.uom,
        sourceLocation: line.source_location_name || 'Vendor Intake',
        destLocation: line.dest_location_name || 'Main Store',
      });
    }

    const formatted = ops.map((op) => {
      const opLines = linesByOp[op.id] || [];
      const firstLine = opLines[0] || {};
      const friendlyType = TYPE_MAP[op.type] || op.type;

      return {
        id: String(op.id),
        refNo: op.reference_no,
        type: friendlyType,
        rawType: op.type,
        partner: op.partner_name || (op.type === 'receipt' ? 'Vendor Intake' : op.type === 'delivery' ? 'Customer Dispatch' : 'Internal Transfer'),
        sourceLocation: firstLine.sourceLocation || 'Dock A',
        destLocation: firstLine.destLocation || 'Main Store',
        date: new Date(op.created_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        status: op.status,
        warehouse: 'Main Warehouse',
        createdBy: op.created_by_name || 'System Operator',
        items: opLines,
      };
    });

    return jsonResponse({ ok: true, operations: formatted });
  } catch (err) {
    return handleApiError(err);
  }
}
