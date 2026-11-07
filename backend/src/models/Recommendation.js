import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { WORK_ORDER_PRIORITY } from '../config/constants.js';

const recommendationSchema = new mongoose.Schema(
  {
    recommendationId: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true
    },
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
      index: true
    },
    predictionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FailurePrediction'
    },
    title: {
      type: String,
      required: true
    },
    suggestedTiming: {
      type: String,
      required: true // e.g. "Within 36 hours before morning milk collection"
    },
    requiredSkills: [
      {
        type: String
      }
    ],
    probableParts: [
      {
        partName: String,
        estimatedCost: Number,
        inStock: Boolean
      }
    ],
    expectedDowntimeHours: {
      type: Number,
      default: 0
    },
    priority: {
      type: String,
      enum: Object.values(WORK_ORDER_PRIORITY),
      default: WORK_ORDER_PRIORITY.HIGH_P1
    },
    safetyImpact: {
      type: String, // e.g. "Food safety pathogen risk: moderate"
      required: true
    },
    costImpact: {
      estimatedRepairCost: { type: Number, default: 0 },
      estimatedMilkSouringLoss: { type: Number, default: 0 },
      totalRiskValue: { type: Number, default: 0 } // e.g. 215000 INR
    },
    operationalImpact: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['PENDING_REVIEW', 'ACCEPTED', 'REJECTED', 'CORRECTED', 'OVERRIDDEN'],
      default: 'PENDING_REVIEW',
      index: true
    },
    reviewerReason: {
      type: String
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: {
      type: Date
    },
    orgScope: {
      cooperativeZone: String,
      plantId: String,
      centerId: String
    }
  },
  {
    timestamps: true,
    versionKey: '__v'
  }
);

export const Recommendation = mongoose.model('Recommendation', recommendationSchema);

