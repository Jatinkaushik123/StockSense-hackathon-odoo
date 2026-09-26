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
    const input = parseOrThrow(schemas.forgotPasswordSchema, {
      email: body.email,
    });
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const result = await authService.requestPasswordOtp(input, { ip });
    return jsonResponse({
      ok: true,
      message: result.devCode
        ? `Demo mode: your reset code is ${result.devCode} (valid ${result.ttlMinutes} minutes).`
        : 'If that email is registered, a reset code has been sent.',
      devCode: result.devCode,
      ttlMinutes: result.ttlMinutes,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
