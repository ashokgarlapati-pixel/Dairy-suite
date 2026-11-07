import express from 'express';
import {
  login,
  register,
  refreshToken,
  logout,
  getMe,
  forgotPassword,
  resetPassword
} from '../controllers/authController.js';
import { validate } from '../middleware/validateMiddleware.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/rbacMiddleware.js';
import { ROLES } from '../config/constants.js';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '../validation/authValidation.js';
import { ApiResponse } from '../utils/apiResponse.js';

const router = express.Router();

// Public Authentication Endpoints
router.post('/login', validate(loginSchema), login);
router.post('/register', validate(registerSchema), register);
router.post('/refresh', refreshToken);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

// Authenticated Endpoints
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

// Verification Endpoints for Backend-Enforced RBAC
router.get('/admin-only', authenticate, authorize(ROLES.MAINTENANCE_ADMIN), (req, res) => {
  return ApiResponse.success(res, { authorized: true, user: req.user }, 'Verified: User holds Maintenance Admin privileges.');
});

router.get('/tech-only', authenticate, authorize(ROLES.TECHNICIAN, ROLES.MAINTENANCE_ADMIN), (req, res) => {
  return ApiResponse.success(res, { authorized: true, user: req.user }, 'Verified: User holds Technician/Admin privileges.');
});

export default router;

