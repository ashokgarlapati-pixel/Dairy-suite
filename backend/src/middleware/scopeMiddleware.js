import { ROLES } from '../config/constants.js';

/**
 * Organizational Scope Middleware
 * Enforces multi-tenancy and data scoping across cooperative zones & chilling centers
 */
export const enforceScope = (req, res, next) => {
  if (!req.user) {
    return next();
  }

  // Maintenance Admin has cooperative-wide access
  if (req.user.role === ROLES.MAINTENANCE_ADMIN) {
    req.scopeQuery = {};
    return next();
  }

  const { cooperativeZone, assignedPlants, assignedCenters } = req.user.orgScope || {};

  // Build MongoDB query filter based on user scope
  const scopeQuery = {};

  if (cooperativeZone && cooperativeZone !== 'ALL') {
    scopeQuery['orgScope.cooperativeZone'] = cooperativeZone;
  }

  if (assignedPlants && assignedPlants.length > 0) {
    scopeQuery['orgScope.plantId'] = { $in: assignedPlants };
  }

  if (assignedCenters && assignedCenters.length > 0) {
    scopeQuery['orgScope.centerId'] = { $in: assignedCenters };
  }

  req.scopeQuery = scopeQuery;
  return next();
};

