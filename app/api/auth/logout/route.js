import authService from '../../../../modules/auth/service.js';
import { jsonResponse, corsOptionsResponse, handleApiError } from '../../_lib/apiHelper.js';

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function POST() {
  try {
    await authService.logout();
    return jsonResponse({ ok: true, message: 'Logged out successfully.' });
  } catch (err) {
    return handleApiError(err);
  }
}
