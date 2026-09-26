import authService from '../../../../modules/auth/service.js';
import { jsonResponse, corsOptionsResponse, parseBody, handleApiError } from '../../_lib/apiHelper.js';
import sanitizeModule from '../../../../modules/security/sanitize.js';

const { schemas, parseOrThrow } = sanitizeModule;

export async function OPTIONS() {
  return corsOptionsResponse();
}

export async function POST(request) {
  try {
    const body = await parseBody(request);
    const input = parseOrThrow(schemas.loginSchema, {
      email: body.email,
      password: body.password,
    });
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const user = await authService.login(input, { ip, setCookie: true });
    return jsonResponse({ ok: true, user });
  } catch (err) {
    return handleApiError(err);
  }
}
