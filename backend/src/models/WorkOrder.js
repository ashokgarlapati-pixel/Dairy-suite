import mongoose from 'mongoose';
import { WORK_ORDER_PRIORITY, WORK_ORDER_STATUS } from '../config/constants.js';

const workOrderSchema = new mongoose.Schema(
  {
    workOrderNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true
    },
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true
    },
    priority: {
      type: String,
      enum: Object.values(WORK_ORDER_PRIORITY),
      default: WORK_ORDER_PRIORITY.MEDIUM_P2,
      required: true,
      index: true
    },
    source: {
      type: String,
      enum: ['MANUAL', 'PREVENTIVE_SCHEDULE', 'AI_PREDICTIVE_TRIGGER'],
      default: 'MANUAL',
      index: true
    },
    status: {
      type: String,
      enum: Object.values(WORK_ORDER_STATUS),
      default: WORK_ORDER_STATUS.CREATED,
      required: true,
      index: true
    },
    assignedTechnicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    createdById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    approvedById: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    scheduledStartDate: {
      type: Date
    },
    scheduledEndDate: {
      type: Date
    },
    actualStartDate: {
      type: Date
    },
    actualCompletionDate: {
      type: Date
    },
    requiredSkills: [
      {
        type: String
      }
    ],
    partsRequired: [
      {
        partId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryPart' },
        partName: String,
        quantityReserved: { type: Number, default: 0 },
        quantityConsumed: { type: Number, default: 0 },
        unitCost: { type: Number, default: 0 }
      }
    ],
    estimatedDowntimeHours: {
      type: Number,
      default: 0
    },
    actualDowntimeHours: {
      type: Number,
      default: 0
    },
    closureDetails: {
      summaryOfWork: String,
      photos: [String],
      signoffSignatureName: String,
      closedAt: Date,
      supervisorNotes: String
    },
    decisionHistory: [
      {
        action: {
          type: String,
          enum: [
            'CREATE',
            'ASSIGN',
            'EDIT',
            'APPROVE',
            'REJECT',
            'DEFER',
            'OVERRIDE',
            'ESCALATE',
            'CLOSE'
          ]
        },
        actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        actorName: String,
        timestamp: { type: Date, default: Date.now },
        reason: String,
        previousValue: String,
        newValue: String,
        outcome: String
      }
    ],
    orgScope: {
      cooperativeZone: { type: String, required: true },
      plantId: String,
      centerId: String
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true,
    versionKey: '__v'
  }
);

workOrderSchema.index({ assignedTechnicianId: 1, status: 1 });
workOrderSchema.index({ 'orgScope.cooperativeZone': 1, status: 1 });

export const WorkOrder = mongoose.model('WorkOrder', workOrderSchema);

