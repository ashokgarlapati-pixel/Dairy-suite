import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { NOTIFICATION_CATEGORIES, NOTIFICATION_SEVERITIES } from '../config/constants.js';

const notificationSchema = new mongoose.Schema(
  {
    notificationId: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true
    },
    recipientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    roleScope: {
      type: String,
      index: true
    },
    orgScope: {
      cooperativeZone: String,
      plantId: String,
      centerId: String
    },
    eventType: {
      type: String,
      enum: ['ASSIGNMENT', 'EXCEPTION', 'APPROVAL', 'ALERT', 'DUE_DATE', 'AI_RESULT', 'SYSTEM_EVENT'],
      default: 'SYSTEM_EVENT',
      index: true
    },
    severity: {
      type: String,
      enum: Object.values(NOTIFICATION_SEVERITIES),
      default: NOTIFICATION_SEVERITIES.INFO,
      index: true
    },
    category: {
      type: String,
      enum: Object.values(NOTIFICATION_CATEGORIES),
      default: NOTIFICATION_CATEGORIES.UNREAD,
      index: true
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    relatedEntity: {
      entityType: String, // 'Asset', 'WorkOrder', 'Prediction', 'Inspection'
      entityId: String
    },
    targetLink: {
      type: String // e.g. "/assets/672a...", "/planning?wo=WO-2026-0819"
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    clearedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

notificationSchema.index({ recipientUserId: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);

