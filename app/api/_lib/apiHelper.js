/**
 * app/api/_lib/apiHelper.js
 * ------------------------------------------------------------------
 * Utility helpers for JSON REST endpoints in Next.js App Router:
 *  - CORS support for local frontend Vite server
 *  - Standard JSON response envelope
 *  - Central error handling (AppError, RBAC, PG errors)
 *  - Safe request body parser
 *  - Session & RBAC guards
 */
const { getSessionUser } = require('../../../modules/auth/session.js');
const { requireUser, AuthorizationError, AuthenticationError } = require('../../../modules/auth/rbac.js');
const errorHandlerModule = require('../../../modules/security/errorHandler.js');
const { AppError, mapPgError } = errorHandlerModule;
const { ValidationError } = require('../../../modules/security/sanitize.js');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie, X-Requested-With',
  'Access-Control-Allow-Credentials': 'true',
};

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return Response.json(data, {
    status,
    headers: {
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

function corsOptionsResponse() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

async function parseBody(request) {
  try {
    const text = await request.text();
    if (!text || !text.trim()) return {};
    return JSON.parse(text);
  } catch (err) {
    throw new AppError('Invalid JSON in request body.', 400);
  }
}

function handleApiError(err) {
  console.error('[API Error]:', err && (err.message || err));
  if (err instanceof ValidationError) {
    return jsonResponse(
      { ok: false, error: 'Validation failed', fieldErrors: err.fieldErrors },
      400
    );
  }
  if (err instanceof AuthenticationError) {
    return jsonResponse({ ok: false, error: err.message || 'Please sign in to continue.' }, 401);
  }
  if (err instanceof AuthorizationError) {
    return jsonResponse({ ok: false, error: err.message || 'Permission denied.' }, 403);
  }
  if (err instanceof AppError) {
    return jsonResponse({ ok: false, error: err.message }, err.status || 400);
  }
  const pgMsg = err && err.code ? mapPgError(err) : null;
  if (pgMsg) {
    return jsonResponse({ ok: false, error: pgMsg }, 400);
  }
  return jsonResponse({ ok: false, error: err?.message || 'Internal server error.' }, 500);
}

module.exports = {
  CORS_HEADERS,
  jsonResponse,
  corsOptionsResponse,
  parseBody,
  handleApiError,
  getSessionUser,
  requireUser,
};
