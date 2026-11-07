import express from 'express';
import {
  ingestTelemetry,
  getAssetTelemetry,
  getSensorTrends
} from '../controllers/telemetryController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { enforceScope } from '../middleware/scopeMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
  singleTelemetryReadingSchema,
  queryTelemetrySchema
} from '../validation/telemetryValidation.js';

const router = express.Router();

/**
 * @route   POST /api/v1/telemetry/ingest
 * @desc    Ingest IoT / SCADA sensor telemetry (single or bulk array)
 * @access  Authenticated / System Ingestion
 */
router.post('/ingest', authenticate, ingestTelemetry);

/**
 * @route   GET /api/v1/telemetry/asset/:assetId
 * @desc    Get recent sensor telemetry for an asset with staleness detector
 * @access  All Authenticated Roles (Scope verified)
 */
router.get(
  '/asset/:assetId',
  authenticate,
  enforceScope,
  validate(queryTelemetrySchema, 'query'),
  getAssetTelemetry
);

/**
 * @route   GET /api/v1/telemetry/asset/:assetId/trends
 * @desc    Get 24-hour sensor trends formatted for Recharts components
 * @access  All Authenticated Roles
 */
router.get(
  '/asset/:assetId/trends',
  authenticate,
  enforceScope,
  getSensorTrends
);

export default router;

