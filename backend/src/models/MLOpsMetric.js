import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const mlopsMetricSchema = new mongoose.Schema(
  {
    metricId: {
      type: String,
      default: uuidv4,
      unique: true,
      index: true
    },
    evaluationDate: {
      type: Date,
      default: Date.now,
      required: true,
      index: true
    },
    assetCategory: {
      type: String,
      required: true,
      index: true
    },
    orgScope: {
      cooperativeZone: { type: String, default: 'ALL' },
      plantId: String,
      centerId: String
    },
    totalPredictions: {
      type: Number,
      default: 0
    },
    truePositives: {
      type: Number,
      default: 0
    },
    falseAlarms: {
      type: Number,
      default: 0
    },
    missedFailures: {
      type: Number,
      default: 0
    },
    avgLeadTimeHours: {
      type: Number,
      default: 0 // Mean hours between prediction and actual fault
    },
    maintenanceEffectivenessScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 90
    },
    driftIndex: {
      type: Number,
      default: 0.02 // Statistical drift between training and inference distribution
    },
    accuracyScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 92.5
    },
    latencyMs: {
      type: Number,
      default: 320 // Model inference latency
    },
    failureRate: {
      type: Number,
      default: 0.04
    },
    adoptionRate: {
      type: Number,
      min: 0,
      max: 100,
      default: 88.0 // % of AI recommendations accepted by plant managers
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

mlopsMetricSchema.index({ evaluationDate: -1, assetCategory: 1 });

export const MLOpsMetric = mongoose.model('MLOpsMetric', mlopsMetricSchema);

