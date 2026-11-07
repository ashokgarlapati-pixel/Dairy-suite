import express from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { ApiResponse } from '../utils/apiResponse.js';
import { validate } from '../middleware/validateMiddleware.js';

const router = express.Router();

/**
 * Health Check Endpoint
 * GET /api/v1/health
 */
router.get('/', (req, res) => {
  const dbStateMap = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting'
  };

  const dbState = mongoose.connection ? dbStateMap[mongoose.connection.readyState] || 'Unknown' : 'Not Initialized';

  return ApiResponse.success(
    res,
    {
      status: 'HEALTHY',
      service: 'AI-Powered Smart Asset Reliability & Maintenance Suite (Backend)',
      targetIndustry: 'Dairy Cooperative Supply Chain',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: dbState,
        connected: mongoose.connection?.readyState === 1
      },
      environment: process.env.NODE_ENV || 'development'
    },
    'Dairy Asset Suite Backend is operating normally'
  );
});

// Sample schema to verify Zod validation
const testValidationSchema = z.object({
  ping: z.string().min(1, 'Ping string is required'),
  count: z.number().int().positive('Count must be a positive integer')
});

/**
 * Zod Validation Test Endpoint
 * POST /api/v1/health/validate-test
 */
router.post('/validate-test', validate(testValidationSchema), (req, res) => {
  return ApiResponse.success(res, req.body, 'Zod validation passed successfully');
});

export default router;

