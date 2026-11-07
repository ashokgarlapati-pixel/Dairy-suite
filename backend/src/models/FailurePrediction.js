import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { FAILURE_RISK_LEVELS } from '../config/constants.js';

const failurePredictionSchema = new mongoose.Schema(
  {
    predictionId: {
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
    predictedFailureMode: {
      type: String,
      required: true,
      trim: true
    },
    riskLevel: {
      type: String,
      enum: Object.values(FAILURE_RISK_LEVELS),
      required: true,
      index: true
    },
    confidenceScore: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      index: true
    },
    remainingUsefulLifeDays: {
      type: Number,
      required: true
    },
    contributingTelemetrySnapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    },
    aiExplanation: {
      type: String,
      required: true
    },
    recommendedActions: [
      {
        type: String
      }
    ],
    modelMetadata: {
      modelName: { type: String, default: 'Gemini 2.5 Flash' },
      modelVersion: { type: String, default: 'v2.5-flash-pro' },
      promptVersion: { type: String, default: 'v2.4-dairy' },
      executionTimestamp: { type: Date, default: Date.now }
    },
    reviewStatus: {
      type: String,
      enum: ['PENDING_REVIEW', 'ACCEPTED', 'OVERRIDDEN', 'REJECTED'],
      default: 'PENDING_REVIEW',
      index: true
    },
    reviewDecision: {
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      reviewedAt: Date,
      overrideReason: String,
      convertedWorkOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder' },
      modifiedPriority: String
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

failurePredictionSchema.index({ assetId: 1, reviewStatus: 1 });

export const FailurePrediction = mongoose.model('FailurePrediction', failurePredictionSchema);

