import mongoose from 'mongoose';
import { Notification } from '../models/Notification.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { recordAuditEvent } from '../utils/auditLogger.js';
import { NOTIFICATION_SEVERITIES, NOTIFICATION_CATEGORIES } from '../config/constants.js';

// Pre-seeded high-fidelity notifications across all 7 event types
const INITIAL_NOTIFICATIONS = [
  {
    _id: 'NTF-001',
    notificationId: 'NTF-001',
    title: 'CRITICAL COLD-CHAIN BREAKDOWN HAZARD',
    message: 'BMC-MYSORE-014 suction pressure depressed at 2.1 bar. Raw milk chilling cycle prolonged to 4.2h. Immediate microbial souring risk!',
    severity: 'CRITICAL_URGENT',
    category: 'URGENT',
    eventType: 'ALERT',
    relatedEntity: { entityType: 'Asset', entityId: 'BMC-MYSORE-014' },
    targetLink: '/assets/BMC-MYSORE-014',
    roleScope: 'ALL',
    isRead: false,
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  },
  {
    _id: 'NTF-002',
    notificationId: 'NTF-002',
    title: 'New Maintenance Work Order Assigned',
    message: 'WO-2026-0819 (Compressor Valve Plate Replacement) assigned to Senior Field Technician.',
    severity: 'WARNING',
    category: 'ASSIGNED',
    eventType: 'ASSIGNMENT',
    relatedEntity: { entityType: 'WorkOrder', entityId: 'WO-2026-0819' },
    targetLink: '/calendar',
    roleScope: 'ALL',
    isRead: false,
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString()
  },
  {
    _id: 'NTF-003',
    notificationId: 'NTF-003',
    title: 'Supervisor Closure Sign-Off Requested',
    message: 'WO-2026-0821 (Homogenizer Plunger Packing Overhaul) submitted for supervisor closure sign-off.',
    severity: 'INFO',
    category: 'UNREAD',
    eventType: 'APPROVAL',
    relatedEntity: { entityType: 'WorkOrder', entityId: 'WO-2026-0821' },
    targetLink: '/planning',
    roleScope: 'ALL',
    isRead: false,
    createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString()
  },
  {
    _id: 'NTF-004',
    notificationId: 'NTF-004',
    title: 'AI Predictive Recommendation Generated',
    message: 'Google Gemini identified regeneration plate fouling on PST-LINE-01. Predicted RUL: 14 days. Avoided loss: ₹4,30,000 INR.',
    severity: 'WARNING',
    category: 'UNREAD',
    eventType: 'AI_RESULT',
    relatedEntity: { entityType: 'Prediction', entityId: 'PST-LINE-01' },
    targetLink: '/recommendations',
    roleScope: 'ALL',
    isRead: true,
    createdAt: new Date(Date.now() - 240 * 60 * 1000).toISOString()
  },
  {
    _id: 'NTF-005',
    notificationId: 'NTF-005',
    title: 'Transit Telemetry Thermal Exception',
    message: 'Chilled tanker TNK-KA09-4412 milk temp rose to 5.2°C (statutory threshold: 4.0°C). Check refrigeration power unit immediately.',
    severity: 'CRITICAL_URGENT',
    category: 'URGENT',
    eventType: 'EXCEPTION',
    relatedEntity: { entityType: 'Asset', entityId: 'TNK-KA09-4412' },
    targetLink: '/assets/TNK-KA09-4412',
    roleScope: 'ALL',
    isRead: false,
    createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString()
  },
  {
    _id: 'NTF-006',
    notificationId: 'NTF-006',
    title: 'Preventive Maintenance Due in 24 Hours',
    message: 'Quarterly chemical de-scaling & CIP gasket seal inspection on Mother Dairy Cold Room CLR-STORE-03.',
    severity: 'WARNING',
    category: 'UNREAD',
    eventType: 'DUE_DATE',
    relatedEntity: { entityType: 'Asset', entityId: 'CLR-STORE-03' },
    targetLink: '/calendar',
    roleScope: 'ALL',
    isRead: false,
    createdAt: new Date(Date.now() - 180 * 60 * 1000).toISOString()
  },
  {
    _id: 'NTF-007',
    notificationId: 'NTF-007',
    title: 'IoT Sensor Telemetry Sync Complete',
    message: 'SCADA Gateway synchronised 42 chilling center telemetry nodes across Mysore and Mandya milk unions. Zero packet drops.',
    severity: 'INFO',
    category: 'SYSTEM_GENERATED',
    eventType: 'SYSTEM_EVENT',
    relatedEntity: { entityType: 'System', entityId: 'GATEWAY-01' },
    targetLink: '/settings',
    roleScope: 'ALL',
    isRead: true,
    createdAt: new Date(Date.now() - 360 * 60 * 1000).toISOString()
  }
];

export let inMemoryNotifications = [...INITIAL_NOTIFICATIONS];

// In-Memory Notification Preferences Storage keyed by userId or role
let inMemoryPreferences = {
  default: {
    role: 'MAINTENANCE_ADMIN',
    eventTypes: {
      ASSIGNMENT: true,
      EXCEPTION: true,
      APPROVAL: true,
      ALERT: true,
      DUE_DATE: true,
      AI_RESULT: true,
      SYSTEM_EVENT: true
    },
    minSeverity: 'INFO',
    ownership: 'ALL_FACILITY',
    orgScope: {
      cooperativeZone: 'Southern Region (All)',
      plantId: 'ALL',
      centerId: 'ALL'
    },
    channels: {
      inApp: true,
      emailDigest: true,
      smsUrgent: true
    }
  }
};

/**
 * GET /api/v1/notifications
 * Get user notifications feed with filtering by category, eventType, severity & isRead
 */
export const getNotifications = async (req, res) => {
  try {
    const { category, eventType, severity, isRead } = req.query;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    let filtered = inMemoryNotifications.filter((n) => !n.clearedAt);

    // Filter by role scope if assigned
    if (userRole && userRole !== 'MAINTENANCE_ADMIN') {
      filtered = filtered.filter((n) => !n.roleScope || n.roleScope === 'ALL' || n.roleScope === userRole);
    }

    // Category / State Filtering
    if (category && category !== 'ALL') {
      if (category === 'UNREAD') {
        filtered = filtered.filter((n) => !n.isRead);
      } else if (category === 'READ') {
        filtered = filtered.filter((n) => n.isRead);
      } else if (category === 'URGENT') {
        filtered = filtered.filter((n) => n.severity === 'CRITICAL_URGENT' || n.category === 'URGENT');
      } else if (category === 'ASSIGNED') {
        filtered = filtered.filter((n) => n.eventType === 'ASSIGNMENT' || n.category === 'ASSIGNED');
      } else if (category === 'SYSTEM_GENERATED') {
        filtered = filtered.filter((n) => n.eventType === 'SYSTEM_EVENT' || n.category === 'SYSTEM_GENERATED');
      } else {
        filtered = filtered.filter((n) => n.category === category);
      }
    }

    // Specific Event Type Filtering
    if (eventType && eventType !== 'ALL') {
      filtered = filtered.filter((n) => n.eventType === eventType);
    }

    // Severity Filtering
    if (severity && severity !== 'ALL') {
      filtered = filtered.filter((n) => n.severity === severity);
    }

    // isRead Filter
    if (isRead !== undefined && isRead !== '') {
      const boolRead = isRead === 'true';
      filtered = filtered.filter((n) => n.isRead === boolRead);
    }

    const unreadCount = inMemoryNotifications.filter((n) => !n.isRead && !n.clearedAt).length;
    const urgentCount = inMemoryNotifications.filter((n) => !n.clearedAt && (n.severity === 'CRITICAL_URGENT' || n.category === 'URGENT')).length;

    return ApiResponse.success(res, {
      unreadCount,
      urgentCount,
      total: filtered.length,
      notifications: filtered
    });
  } catch (error) {
    console.error('[Notification Controller Error] getNotifications:', error);
    return ApiResponse.error(res, error.message || 'Failed to fetch notifications', 500);
  }
};

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark individual notification as read
 */
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notif = inMemoryNotifications.find(
      (item) => item._id === id || item.notificationId === id || item.title.includes(id)
    );

    if (!notif) {
      return ApiResponse.error(res, 'Notification not found', 404);
    }

    notif.isRead = true;

    return ApiResponse.success(res, { notification: notif }, 'Notification marked as read');
  } catch (error) {
    console.error('[Notification Controller Error] markAsRead:', error);
    return ApiResponse.error(res, error.message || 'Failed to update notification', 500);
  }
};

/**
 * POST /api/v1/notifications/mark-all-read
 * Mark all notifications as read
 */
export const markAllAsRead = async (req, res) => {
  try {
    inMemoryNotifications.forEach((n) => {
      n.isRead = true;
    });

    return ApiResponse.success(res, { success: true }, 'All notifications marked as read');
  } catch (error) {
    console.error('[Notification Controller Error] markAllAsRead:', error);
    return ApiResponse.error(res, error.message || 'Failed to update notifications', 500);
  }
};

/**
 * DELETE /api/v1/notifications/:id
 * Clear individual notification
 */
export const clearNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notif = inMemoryNotifications.find(
      (item) => item._id === id || item.notificationId === id
    );

    if (!notif) {
      return ApiResponse.error(res, 'Notification not found', 404);
    }

    notif.clearedAt = new Date().toISOString();

    return ApiResponse.success(res, { notificationId: id, cleared: true }, 'Notification cleared successfully');
  } catch (error) {
    console.error('[Notification Controller Error] clearNotification:', error);
    return ApiResponse.error(res, error.message || 'Failed to clear notification', 500);
  }
};

/**
 * POST /api/v1/notifications/clear-all
 * Clear all notifications (or all read notifications)
 */
export const clearAllNotifications = async (req, res) => {
  try {
    const { readOnly = false } = req.body;
    let clearedCount = 0;

    inMemoryNotifications.forEach((n) => {
      if (!n.clearedAt && (!readOnly || n.isRead)) {
        n.clearedAt = new Date().toISOString();
        clearedCount++;
      }
    });

    return ApiResponse.success(res, { clearedCount }, `${clearedCount} notifications cleared successfully`);
  } catch (error) {
    console.error('[Notification Controller Error] clearAllNotifications:', error);
    return ApiResponse.error(res, error.message || 'Failed to clear notifications', 500);
  }
};

/**
 * GET /api/v1/notifications/preferences
 * Retrieve notification preferences for current user / role
 */
export const getNotificationPreferences = async (req, res) => {
  try {
    const userRole = req.user?.role || 'MAINTENANCE_ADMIN';
    const userId = req.user?._id || 'default';

    const userPrefs = inMemoryPreferences[userId] || inMemoryPreferences[userRole] || {
      ...inMemoryPreferences.default,
      role: userRole,
      orgScope: req.user?.orgScope || inMemoryPreferences.default.orgScope
    };

    return ApiResponse.success(res, { preferences: userPrefs });
  } catch (error) {
    console.error('[Notification Controller Error] getNotificationPreferences:', error);
    return ApiResponse.error(res, error.message || 'Failed to fetch preferences', 500);
  }
};

/**
 * PUT /api/v1/notifications/preferences
 * Update notification preferences based on role, event type, severity, ownership, and org scope
 */
export const updateNotificationPreferences = async (req, res) => {
  try {
    const userRole = req.user?.role || 'MAINTENANCE_ADMIN';
    const userId = req.user?._id || 'default';
    const { role, eventTypes, minSeverity, ownership, orgScope, channels } = req.body;

    if (minSeverity && !['INFO', 'WARNING', 'CRITICAL_URGENT'].includes(minSeverity)) {
      return ApiResponse.error(res, 'Invalid minSeverity value. Must be INFO, WARNING, or CRITICAL_URGENT', 400);
    }

    if (ownership && !['ALL_FACILITY', 'ASSIGNED_TO_ME'].includes(ownership)) {
      return ApiResponse.error(res, 'Invalid ownership scope. Must be ALL_FACILITY or ASSIGNED_TO_ME', 400);
    }

    const updated = {
      role: role || userRole,
      eventTypes: {
        ASSIGNMENT: eventTypes?.ASSIGNMENT ?? true,
        EXCEPTION: eventTypes?.EXCEPTION ?? true,
        APPROVAL: eventTypes?.APPROVAL ?? true,
        ALERT: eventTypes?.ALERT ?? true,
        DUE_DATE: eventTypes?.DUE_DATE ?? true,
        AI_RESULT: eventTypes?.AI_RESULT ?? true,
        SYSTEM_EVENT: eventTypes?.SYSTEM_EVENT ?? true
      },
      minSeverity: minSeverity || 'INFO',
      ownership: ownership || 'ALL_FACILITY',
      orgScope: orgScope || req.user?.orgScope || {
        cooperativeZone: 'Southern Region (All)',
        plantId: 'ALL',
        centerId: 'ALL'
      },
      channels: {
        inApp: channels?.inApp ?? true,
        emailDigest: channels?.emailDigest ?? true,
        smsUrgent: channels?.smsUrgent ?? true
      },
      updatedAt: new Date().toISOString()
    };

    inMemoryPreferences[userId] = updated;
    inMemoryPreferences[userRole] = updated;

    // Record immutable audit log
    await recordAuditEvent({
      req,
      action: 'CONFIG_CHANGE',
      resourceType: 'NotificationPreferences',
      resourceId: userRole,
      outcome: 'SUCCESS',
      reason: `Updated notification preferences for role ${userRole}: minSeverity=${updated.minSeverity}, ownership=${updated.ownership}`
    });

    return ApiResponse.success(res, { preferences: updated }, 'Notification preferences updated successfully');
  } catch (error) {
    console.error('[Notification Controller Error] updateNotificationPreferences:', error);
    return ApiResponse.error(res, error.message || 'Failed to update notification preferences', 500);
  }
};
