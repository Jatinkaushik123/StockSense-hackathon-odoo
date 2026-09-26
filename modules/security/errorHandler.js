/**
 * modules/security/errorHandler.js
 * ------------------------------------------------------------------
 * Central error taxonomy + Server Action wrapper.
 * - Every action runs inside withAction(): authz/validation/SQL errors are
 *   converted into a safe {ok:false, error, fieldErrors} envelope.
 * - Unexpected errors are logged server-side; clients only ever see a
 *   generic message (no stack traces, no SQL fragments leak to the UI).
 */
const { ValidationError } = require('./sanitize.js');
const {
  AuthenticationError,
  AuthorizationError,
} = require('../auth/rbac.js');

class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'AppError';
    this.status = status;
  }
}

/** Map raw PostgreSQL error codes to safe, human-friendly messages. */
function mapPgError(err) {
  switch (err.code) {
    case '23505': // unique_violation
      if (/users_email/i.test(err.constraint || '')) return 'This email is already registered.';
      if (/products_sku/i.test(err.constraint || '')) return 'This SKU already exists in the catalog.';
      if (/operations_reference/i.test(err.constraint || '')) return 'Duplicate operation reference.';
      if (/uq_locations_name_type/i.test(err.constraint || '')) return 'A location with this name and type already exists.';
      if (/unique_product_location/i.test(err.constraint || '')) return 'This product already has a balance at that location.';
      return 'A record with the same unique value already exists.';
    case '23503': // foreign_key_violation
      return 'Referenced record does not exist.';
    case '23514': // check_violation
      return 'Invalid value: violates a database constraint.';
    case '23502': // not_null_violation
      return 'A required field is missing.';
    case '40001': // serialization_failure
    case '40P01': // deadlock_detected
      return 'The operation conflicted with another concurrent operation. Please retry.';
    default:
      return null;
  }
}

/**
 * Next.js control-flow errors (redirect/notFound) must bubble up
 * untouched — they are not application errors.
 */
function isFrameworkControlFlow(err) {
  return Boolean(err && typeof err.digest === 'string' && (
    err.digest.startsWith('NEXT_REDIRECT') || err.digest === 'NEXT_NOT_FOUND'
  ));
}

/**
 * Wrap a Server Action. Returns an action that resolves to
 * { ok: true, data } or { ok: false, error, fieldErrors }.
 */
function withAction(fn) {
  return async (...args) => {
    try {
      const data = await fn(...args);
      return { ok: true, data };
    } catch (err) {
      if (isFrameworkControlFlow(err)) throw err;
      if (err instanceof ValidationError) {
        return { ok: false, error: 'Please fix the highlighted fields.', fieldErrors: err.fieldErrors };
      }
      if (err instanceof AuthenticationError || err instanceof AuthorizationError) {
        return { ok: false, error: err.message };
      }
      if (err instanceof AppError) {
        return { ok: false, error: err.message };
      }
      const pgMessage = err && err.code ? mapPgError(err) : null;
      if (pgMessage) {
        console.error('[action] pg error:', err.code, err.detail || err.message);
        return { ok: false, error: pgMessage };
      }
      console.error('[action] unexpected error:', err && (err.stack || err.message || err));
      return { ok: false, error: 'Something went wrong. Please try again.' };
    }
  };
}

/** Format an error for Next.js redirect flows (throws AppError safely). */
function httpError(message, status = 400) {
  return new AppError(message, status);
}

/**
 * Convert a raw pg error into an AppError when we have a friendly
 * message for it (used by modules so DIRECT callers — not just the
 * Server Action wrapper — never see raw constraint names).
 */
function translatePgError(err) {
  if (!err || !err.code) return null;
  const friendly = mapPgError(err);
  if (!friendly) return null;
  const wrapped = new AppError(friendly, err.code === '23505' ? 409 : 400);
  wrapped.cause = err;
  return wrapped;
}

module.exports = { withAction, AppError, mapPgError, translatePgError, isFrameworkControlFlow };
