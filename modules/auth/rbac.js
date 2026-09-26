/**
 * modules/auth/rbac.js
 * ------------------------------------------------------------------
 * Role-Based Access Control guard for every privileged action.
 * Roles: 'manager' (Inventory Manager) | 'staff' (Warehouse Staff).
 */
const { getSessionUser } = require('./session.js');

class AuthorizationError extends Error {
  constructor(message) {
    super(message || 'You are not authorized to perform this action.');
    this.name = 'AuthorizationError';
    this.status = 403;
  }
}
class AuthenticationError extends Error {
  constructor(message) {
    super(message || 'Please sign in to continue.');
    this.name = 'AuthenticationError';
    this.status = 401;
  }
}

/**
 * Throws unless a user is signed in. Returns the session user.
 * @param {{role?: 'manager'|'staff', minRole?: 'staff'|'manager'}} opts
 */
async function requireUser(opts = {}) {
  const user = await getSessionUser();
  if (!user) throw new AuthenticationError();

  const minRole = opts.minRole || opts.role;
  if (minRole === 'staff' && user.role !== 'staff' && user.role !== 'manager') {
    throw new AuthorizationError('Unknown role.');
  }
  if (minRole === 'manager' && user.role !== 'manager') {
    throw new AuthorizationError('Inventory Manager permissions required.');
  }
  return user;
}

const ROLE_LABELS = { manager: 'Inventory Manager', staff: 'Warehouse Staff' };

module.exports = { requireUser, AuthorizationError, AuthenticationError, ROLE_LABELS };
