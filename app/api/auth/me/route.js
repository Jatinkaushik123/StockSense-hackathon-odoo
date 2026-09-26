import { getSessionUser } from '../../../../modules/auth/session.js';
import { jsonResponse, corsOptionsResponse, handleApiError } from '../../_lib/apiHelper.js';

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function GET() {
  try {
    const user = await getSessionUser();
    return jsonResponse({ ok: true, user });
  } catch (err) {
    return handleApiError(err);
  }
}
