import express from 'express';
import {
  getAuditLogs,
  getSystemSettings,
  updateSystemSettings,
  rejectAuditMutation
} from '../controllers/auditController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/rbacMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

/**
 * @route   GET /api/v1/audit-logs
 * @desc    Searchable immutable audit logs with multi-filters (Admin & Ops Manager)
 */
router.get(
  '/',
  authenticate,
  authorize(ROLES.MAINTENANCE_ADMIN, ROLES.OPERATIONS_MANAGER),
  getAuditLogs
);

/**
 * @route   GET /api/v1/audit-logs/settings
 * @desc    Get master system configuration across all 6 domains (Admin only)
 */
router.get(
  '/settings',
  authenticate,
  authorize(ROLES.MAINTENANCE_ADMIN),
  getSystemSettings
);

/**
 * @route   PATCH /api/v1/audit-logs/settings
 * @desc    Update system configuration & log CONFIG_CHANGE audit event (Admin only)
 */
router.patch(
  '/settings',
  authenticate,
  authorize(ROLES.MAINTENANCE_ADMIN),
  updateSystemSettings
);

router.put(
  '/settings',
  authenticate,
  authorize(ROLES.MAINTENANCE_ADMIN),
  updateSystemSettings
);

/**
 * @route   DELETE /api/v1/audit-logs/:id or /api/v1/audit-logs
 * @desc    Rejects deletion or mutation to enforce tamper-proof immutability
 */
router.delete('/:id', authenticate, rejectAuditMutation);
router.delete('/', authenticate, rejectAuditMutation);
router.put('/:id', authenticate, rejectAuditMutation);
router.patch('/:id', authenticate, rejectAuditMutation);

export default router;
