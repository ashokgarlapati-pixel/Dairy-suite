import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { AUDIT_ACTIONS, AUDIT_OUTCOMES } from '../config/constants.js';

const auditLogSchema = new mongoose.Schema(
  {
    logId: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    actorName: {
      type: String,
      default: 'SYSTEM'
    },
    actorRole: {
      type: String,
      index: true
    },
    action: {
      type: String,
      enum: Object.values(AUDIT_ACTIONS),
      required: true,
      index: true
    },
    resourceType: {
      type: String, // 'Asset', 'WorkOrder', 'User', 'Prediction', 'SystemConfig'
      required: true,
      index: true
    },
    resourceId: {
      type: String,
      index: true
    },
    orgScope: {
      cooperativeZone: String,
      plantId: String,
      centerId: String
    },
    outcome: {
      type: String,
      enum: Object.values(AUDIT_OUTCOMES),
      default: AUDIT_OUTCOMES.SUCCESS,
      index: true
    },
    ipAddress: {
      type: String,
      default: '127.0.0.1'
    },
    userAgent: {
      type: String
    },
    previousState: {
      type: mongoose.Schema.Types.Mixed
    },
    newState: {
      type: mongoose.Schema.Types.Mixed
    },
    reason: {
      type: String
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: false, // Explicit timestamp field used for immutable audit
    versionKey: false
  }
);

// IMMUTABILITY ENFORCEMENT HOOKS
// Prevent any modification or deletion of audit logs at the ODM layer
const throwImmutabilityError = function (next) {
  const err = new Error('SECURITY VIOLATION: Audit logs are strictly append-only and immutable.');
  err.statusCode = 403;
  next(err);
};

auditLogSchema.pre('updateOne', throwImmutabilityError);
auditLogSchema.pre('updateMany', throwImmutabilityError);
auditLogSchema.pre('findOneAndUpdate', throwImmutabilityError);
auditLogSchema.pre('deleteOne', throwImmutabilityError);
auditLogSchema.pre('deleteMany', throwImmutabilityError);
auditLogSchema.pre('findOneAndDelete', throwImmutabilityError);

// Compound index for fast filtering
auditLogSchema.index({ timestamp: -1, action: 1, actorRole: 1 });
auditLogSchema.index({ 'orgScope.cooperativeZone': 1, timestamp: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);

