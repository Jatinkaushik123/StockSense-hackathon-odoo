import moveHistory from '../../../modules/operations/moveHistory.js';
import { jsonResponse, corsOptionsResponse, handleApiError } from '../_lib/apiHelper.js';

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page')) || 0;
    const pageSize = Number(searchParams.get('pageSize')) || 50;
    const search = searchParams.get('search') || null;
    let type = searchParams.get('type') || null;
    if (type === 'Transfer') type = 'internal';
    else if (type && type !== 'All') type = type.toLowerCase();
    else type = null;

    const productId = searchParams.get('productId') ? Number(searchParams.get('productId')) : null;
    const locationId = searchParams.get('locationId') ? Number(searchParams.get('locationId')) : null;

    const [history, stats] = await Promise.all([
      moveHistory.listMoves({ page, pageSize, search, type, productId, locationId }),
      moveHistory.moveStats(),
    ]);

    const formattedMoves = history.moves.map((m) => {
      const typeMap = {
        receipt: 'Receipt',
        delivery: 'Delivery',
        internal: 'Transfer',
        adjustment: 'Adjustment',
      };
      return {
        id: `mh-${m.id}`,
        timestamp: new Date(m.timestamp).toISOString().replace('T', ' ').substring(0, 19),
        refNo: m.reference_no || `REF-${m.id}`,
        type: typeMap[m.operation_type] || m.operation_type || 'Transfer',
        productId: String(m.product_id),
        productName: m.product_name,
        sku: m.sku,
        sourceLocation: m.source_location,
        destLocation: m.dest_location,
        quantity: Number(m.quantity),
        user: m.responsible || 'System Operator',
        uom: m.uom || 'pcs',
      };
    });

    return jsonResponse({
      ok: true,
      moves: formattedMoves,
      stats,
      page: history.page,
      pageSize: history.pageSize,
      total: history.total,
      pageCount: history.pageCount,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
