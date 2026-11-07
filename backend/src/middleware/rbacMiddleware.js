import { ApiResponse } from '../utils/apiResponse.js';
import { recordAuditEvent } from '../utils/auditLogger.js';

/**
 * Role-Based Access Control (RBAC) Middleware
 * Enforces least-privilege role permissions on protected routes
 */
export const authorize = (...allowedRoles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return ApiResponse.error(res, 'Authentication required prior to permission verification.', 401);
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      // Record access denial to immutable audit log
      await recordAuditEvent({
        req,
        actorId: req.user._id,
        actorName: req.user.fullName,
        actorRole: userRole,
        action: 'DATA_ACCESS',
        resourceType: 'API_ENDPOINT',
        resourceId: req.originalUrl,
        orgScope: req.user.orgScope,
        outcome: 'ACCESS_DENIED',
        reason: `Role '${userRole}' is not permitted to access resource. Permitted roles: [${allowedRoles.join(', ')}]`
      });

      return ApiResponse.error(
        res,
        `Access denied. Role '${userRole}' does not possess sufficient privileges to perform this action.`,
        403,
        [
          {
            field: 'role',
            message: `Required one of: [${allowedRoles.join(', ')}]`
          }
        ]
      );
    }

    return next();
  };
};

