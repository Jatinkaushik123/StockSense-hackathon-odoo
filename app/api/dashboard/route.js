import dashboard from '../../../modules/operations/dashboard.js';
import { jsonResponse, corsOptionsResponse, handleApiError } from '../_lib/apiHelper.js';

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET() {
  try {
    const [totals, lowStock, pending, activity, recent] = await Promise.all([
      dashboard.inventoryTotals(),
      dashboard.lowStockItems({ limit: 15 }),
      dashboard.pendingDocumentCounts(),
      dashboard.activityStats(),
      dashboard.recentMoves({ limit: 10 }),
    ]);

    return jsonResponse({
      ok: true,
      totals,
      lowStock,
      pending,
      activity,
      recentMoves: recent,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
