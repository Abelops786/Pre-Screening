const { error } = require('../utils/responseHelper');

// Role hierarchy: SUPER_ADMIN > ADMIN > RECRUITER
const ROLE_WEIGHT = { SUPER_ADMIN: 3, ADMIN: 2, RECRUITER: 1 };

/**
 * Require the user to have at least one of the specified roles.
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return error(res, 'Unauthenticated', 401);

  const userWeight = ROLE_WEIGHT[req.user.role] || 0;
  const minRequired = Math.min(...roles.map((r) => ROLE_WEIGHT[r] || 99));

  if (userWeight < minRequired) {
    return error(res, 'Insufficient permissions', 403);
  }
  next();
};

const isSuperAdmin = requireRole('SUPER_ADMIN');
const isAdmin      = requireRole('ADMIN');       // ADMIN or SUPER_ADMIN
const isRecruiter  = requireRole('RECRUITER');   // any role

module.exports = { requireRole, isSuperAdmin, isAdmin, isRecruiter };
