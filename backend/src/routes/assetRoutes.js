import express from 'express';
import {
  getAssets,
  getAssetStats,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset
} from '../controllers/assetController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/rbacMiddleware.js';
import { enforceScope } from '../middleware/scopeMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
  createAssetSchema,
  updateAssetSchema,
  queryAssetsSchema
} from '../validation/assetValidation.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

/**
 * @route   GET /api/v1/assets
 * @desc    Get all assets (filtered, searched, paginated, and scoped)
 * @access  All Authenticated Roles (Scoped by Zone/Plant)
 */
router.get(
  '/',
  authenticate,
  enforceScope,
  validate(queryAssetsSchema, 'query'),
  getAssets
);

/**
 * @route   GET /api/v1/assets/stats
 * @desc    Get summary statistics and fleet health metrics
 * @access  All Authenticated Roles (Scoped by Zone/Plant)
 */
router.get(
  '/stats',
  authenticate,
  enforceScope,
  getAssetStats
);

/**
 * @route   GET /api/v1/assets/:id
 * @desc    Get asset profile and telemetry trends by ID or assetTag
 * @access  All Authenticated Roles (Scope verified)
 */
router.get(
  '/:id',
  authenticate,
  enforceScope,
  getAssetById
);

/**
 * @route   POST /api/v1/assets
 * @desc    Register a new dairy equipment asset
 * @access  Maintenance Admin, Operations Manager
 */
router.post(
  '/',
  authenticate,
  authorize(ROLES.MAINTENANCE_ADMIN, ROLES.OPERATIONS_MANAGER),
  validate(createAssetSchema, 'body'),
  createAsset
);

/**
 * @route   PATCH /api/v1/assets/:id
 * @desc    Update dairy asset specifications or status
 * @access  Maintenance Admin, Operations Manager
 */
router.patch(
  '/:id',
  authenticate,
  authorize(ROLES.MAINTENANCE_ADMIN, ROLES.OPERATIONS_MANAGER),
  validate(updateAssetSchema, 'body'),
  updateAsset
);

/**
 * @route   DELETE /api/v1/assets/:id
 * @desc    Soft delete / Decommission an asset
 * @access  Maintenance Admin Only
 */
router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.MAINTENANCE_ADMIN),
  deleteAsset
);

export default router;

