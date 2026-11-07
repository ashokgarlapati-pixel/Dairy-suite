import express from 'express';
import {
  predictAssetFailure,
  getPredictions,
  getRecommendations,
  reviewRecommendation,
  getMLOpsMetrics,
  getAIFeedback,
  submitAIFeedback
} from '../controllers/aiController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/rbacMiddleware.js';
import { enforceScope } from '../middleware/scopeMiddleware.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

/**
 * @route   POST /api/v1/ai/predict/:assetId
 * @desc    Trigger AI Predictive Diagnostics & RUL for dairy asset
 * @access  Maintenance Admin, Operations Manager
 */
router.post(
  '/predict/:assetId',
  authenticate,
  authorize(ROLES.MAINTENANCE_ADMIN, ROLES.OPERATIONS_MANAGER, ROLES.TECHNICIAN),
  predictAssetFailure
);

/**
 * @route   GET /api/v1/ai/predictions
 * @desc    Get recent predictive records
 * @access  All Authenticated Roles
 */
router.get('/predictions', authenticate, enforceScope, getPredictions);

/**
 * @route   GET /api/v1/ai/recommendations
 * @desc    Get active recommendations pending human review
 * @access  All Authenticated Roles
 */
router.get('/recommendations', authenticate, enforceScope, getRecommendations);

/**
 * @route   POST /api/v1/ai/recommendations/:id/review
 * @desc    Human-in-the-Loop Decision: Accept, Reject, Correct, or Override AI suggestion
 * @access  Maintenance Admin, Operations Manager
 */
router.post(
  '/recommendations/:id/review',
  authenticate,
  authorize(ROLES.MAINTENANCE_ADMIN, ROLES.OPERATIONS_MANAGER),
  reviewRecommendation
);

/**
 * @route   GET /api/v1/ai/mlops-metrics
 * @desc    Get MLOps accuracy, quality, false alarms, drift & category metrics
 * @access  Admin, Operations Manager, Technician
 */
router.get(
  '/mlops-metrics',
  authenticate,
  authorize(ROLES.MAINTENANCE_ADMIN, ROLES.OPERATIONS_MANAGER, ROLES.TECHNICIAN),
  getMLOpsMetrics
);

/**
 * @route   GET /api/v1/ai/feedback
 * @desc    Get ground-truth feedback on AI predictions
 * @access  All Authenticated Roles
 */
router.get('/feedback', authenticate, getAIFeedback);

/**
 * @route   POST /api/v1/ai/feedback
 * @desc    Submit user feedback and ground-truth validation for AI predictions
 * @access  All Authenticated Roles (Technicians, Ops Managers, Admins)
 */
router.post('/feedback', authenticate, submitAIFeedback);

export default router;

