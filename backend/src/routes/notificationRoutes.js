import express from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  clearNotification,
  clearAllNotifications,
  getNotificationPreferences,
  updateNotificationPreferences
} from '../controllers/notificationController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @route   GET /api/v1/notifications
 * @desc    Get user notifications feed with category/eventType/severity filters
 */
router.get('/', authenticate, getNotifications);

/**
 * @route   GET /api/v1/notifications/preferences
 * @desc    Get user notification preferences
 */
router.get('/preferences', authenticate, getNotificationPreferences);

/**
 * @route   PUT /api/v1/notifications/preferences
 * @desc    Update notification preferences by role, eventType, severity, ownership, orgScope
 */
router.put('/preferences', authenticate, updateNotificationPreferences);

/**
 * @route   PATCH /api/v1/notifications/:id/read
 * @desc    Mark individual notification as read
 */
router.patch('/:id/read', authenticate, markAsRead);

/**
 * @route   POST /api/v1/notifications/mark-all-read
 * @desc    Mark all notifications as read
 */
router.post('/mark-all-read', authenticate, markAllAsRead);

/**
 * @route   DELETE /api/v1/notifications/:id
 * @desc    Clear individual notification
 */
router.delete('/:id', authenticate, clearNotification);

/**
 * @route   POST /api/v1/notifications/clear-all
 * @desc    Clear all (or all read) notifications
 */
router.post('/clear-all', authenticate, clearAllNotifications);

export default router;
