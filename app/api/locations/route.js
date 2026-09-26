import locations from '../../../modules/products/locations.js';
import stock from '../../../modules/products/stock.js';
import { jsonResponse, corsOptionsResponse, parseBody, handleApiError, requireUser } from '../_lib/apiHelper.js';
import sanitizeModule from '../../../modules/security/sanitize.js';

const { schemas, parseOrThrow } = sanitizeModule;

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || null;
    const [allLocations, summary] = await Promise.all([
      locations.listLocations({ type }),
      stock.locationSummary({ internalOnly: false }),
    ]);
    return jsonResponse({ ok: true, locations: allLocations, summary });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request) {
  try {
    await requireUser({ minRole: 'manager' });
    const body = await parseBody(request);
    const input = parseOrThrow(schemas.locationSchema, {
      name: body.name,
      warehouseName: body.warehouseName || 'Main Warehouse',
      type: body.type,
    });
    const location = await locations.createLocation(input);
    return jsonResponse({ ok: true, location, message: `Location "${location.name}" created.` }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
