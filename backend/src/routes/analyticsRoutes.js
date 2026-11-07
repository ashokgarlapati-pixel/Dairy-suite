import express from 'express';
import {
  getDashboardAnalytics,
  exportReport,
  getReportHistory,
  getSavedConfigurations,
  saveConfiguration
} from '../controllers/analyticsController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/rbacMiddleware.js';
import { enforceScope } from '../middleware/scopeMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

/**
 * @route   GET /api/v1/analytics/dashboard
 * @desc    Get aggregated fleet reliability KPIs, downtime & MTBF
 */
router.get('/dashboard', authenticate, enforceScope, getDashboardAnalytics);

/**
 * @route   GET /api/v1/analytics/reports/history
 * @desc    Get history of generated reliability reports
 */
router.get('/reports/history', authenticate, getReportHistory);

/**
 * @route   GET /api/v1/analytics/reports/saved-configurations
 * @desc    Get saved report configurations
 */
router.get('/reports/saved-configurations', authenticate, getSavedConfigurations);

/**
 * @route   POST /api/v1/analytics/reports/saved-configurations
 * @desc    Save a custom report configuration
 */
router.post('/reports/saved-configurations', authenticate, saveConfiguration);

/**
 * @route   GET /api/v1/analytics/export
 * @desc    Export CSV/PDF reliability reports
 */
router.get(
  '/export',
  authenticate,
  authorize(ROLES.MAINTENANCE_ADMIN, ROLES.OPERATIONS_MANAGER),
  exportReport
);

export default router;
