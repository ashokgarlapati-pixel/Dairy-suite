import express from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  toggleUserStatus,
  getRolePermissions,
  updateRolePermissions
} from '../controllers/userController.js';
import { authenticate } from '../middleware/authMiddleware.js';
import { authorize } from '../middleware/rbacMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import { createUserSchema, updateUserSchema } from '../validation/userValidation.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

/**
 * @route   GET /api/v1/users/roles/permissions
 * @desc    Get permissions matrix across all roles (Admin Only)
 */
router.get(
  '/roles/permissions',
  authenticate,
  authorize(ROLES.MAINTENANCE_ADMIN),
  getRolePermissions
);

/**
 * @route   PUT /api/v1/users/roles/permissions
 * @desc    Update role permissions (Admin Only)
 */
router.put(
  '/roles/permissions',
  authenticate,
  authorize(ROLES.MAINTENANCE_ADMIN),
  updateRolePermissions
);

/**
 * @route   GET /api/v1/users
 * @desc    List all cooperative users (Admin Only)
 */
router.get('/', authenticate, authorize(ROLES.MAINTENANCE_ADMIN), getUsers);

/**
 * @route   GET /api/v1/users/:id
 * @desc    Get user profile and access history (Admin Only)
 */
router.get('/:id', authenticate, authorize(ROLES.MAINTENANCE_ADMIN), getUserById);

/**
 * @route   POST /api/v1/users
 * @desc    Provision new cooperative user (Admin Only)
 */
router.post(
  '/',
  authenticate,
  authorize(ROLES.MAINTENANCE_ADMIN),
  validate(createUserSchema, 'body'),
  createUser
);

/**
 * @route   PUT /api/v1/users/:id
 * @desc    Edit existing user details (Admin Only)
 */
router.put(
  '/:id',
  authenticate,
  authorize(ROLES.MAINTENANCE_ADMIN),
  validate(updateUserSchema, 'body'),
  updateUser
);

/**
 * @route   PATCH /api/v1/users/:id/status
 * @desc    Activate or deactivate user account (Admin Only)
 */
router.patch(
  '/:id/status',
  authenticate,
  authorize(ROLES.MAINTENANCE_ADMIN),
  toggleUserStatus
);

export default router;
