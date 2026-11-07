import express from 'express';
import {
  getWorkOrders,
  getWorkOrderById,
  createWorkOrder,
  updateWorkOrderStatus,
  updateWorkOrder,
  uploadEvidence,
  verifyClosure
} from '../controllers/workOrderController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/rbacMiddleware.js';
import { enforceScope } from '../middleware/scopeMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
  createWorkOrderSchema,
  updateWorkOrderStatusSchema,
  uploadEvidenceSchema,
  verifyClosureSchema
} from '../validation/workOrderValidation.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

/**
 * @route   GET /api/v1/work-orders
 * @desc    Get all work orders (filtered by status, priority, technician, asset)
 * @access  All Authenticated Roles
 */
router.get('/', authenticate, enforceScope, getWorkOrders);

/**
 * @route   GET /api/v1/work-orders/:id
 * @desc    Get work order details with populated asset and evidence
 * @access  All Authenticated Roles
 */
router.get('/:id', authenticate, enforceScope, getWorkOrderById);

/**
 * @route   POST /api/v1/work-orders
 * @desc    Create a work order
 * @access  Admin, Ops Manager, Technician (draft)
 */
router.post(
  '/',
  authenticate,
  validate(createWorkOrderSchema, 'body'),
  createWorkOrder
);

/**
 * @route   PATCH /api/v1/work-orders/:id/status
 * @desc    Transition work order status across lifecycle
 * @access  Role-Enforced Lifecycle Transition
 */
router.patch(
  '/:id/status',
  authenticate,
  validate(updateWorkOrderStatusSchema, 'body'),
  updateWorkOrderStatus
);

/**
 * @route   PATCH /api/v1/work-orders/:id
 * @desc    General work order editing, assignment, priority escalation, deferral, and supervisor override
 * @access  Maintenance Admin, Operations Manager
 */
router.patch(
  '/:id',
  authenticate,
  updateWorkOrder
);

/**
 * @route   POST /api/v1/work-orders/:id/evidence
 * @desc    Field Technician Mobile Evidence Upload (Checklist, Photos, Notes, GPS)
 * @access  Technician, Admin
 */
router.post(
  '/:id/evidence',
  authenticate,
  validate(uploadEvidenceSchema, 'body'),
  uploadEvidence
);

/**
 * @route   POST /api/v1/work-orders/:id/verify
 * @desc    Multi-Tier Supervisor Sign-Off and Formal Closure Verification
 * @access  Maintenance Admin, Operations Manager
 */
router.post(
  '/:id/verify',
  authenticate,
  authorize(ROLES.MAINTENANCE_ADMIN, ROLES.OPERATIONS_MANAGER),
  validate(verifyClosureSchema, 'body'),
  verifyClosure
);

export default router;

