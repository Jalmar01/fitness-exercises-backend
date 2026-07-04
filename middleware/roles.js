/**
 * Middleware factory: Authorize by roles.
 *
 * Returns a middleware function that checks if `req.user.role`
 * is included in the provided allowed roles.
 *
 * Returns 403 if the role is not permitted.
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
}
