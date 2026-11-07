import mongoose from 'mongoose';
import { ASSET_CATEGORIES, ASSET_CRITICALITY, ASSET_STATUS, FAILURE_RISK_LEVELS } from '../config/constants.js';

const assetSchema = new mongoose.Schema(
  {
    assetTag: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    category: {
      type: String,
      enum: Object.values(ASSET_CATEGORIES),
      required: true,
      index: true
    },
    owner: {
      ownerType: {
        type: String,
        enum: ['COOPERATIVE', 'CONTRACTOR', 'VILLAGE_SOCIETY'],
        default: 'COOPERATIVE'
      },
      ownerName: { type: String, default: 'Dairy Union Federation' },
      contactPhone: String
    },
    orgScope: {
      cooperativeZone: { type: String, required: true, index: true },
      plantId: { type: String, index: true },
      centerId: { type: String, index: true }
    },
    location: {
      facilityName: { type: String, required: true },
      department: String,
      building: String,
      gpsCoordinates: {
        lat: Number,
        lng: Number
      }
    },
    criticality: {
      type: String,
      enum: Object.values(ASSET_CRITICALITY),
      default: ASSET_CRITICALITY.MEDIUM_P2,
      required: true,
      index: true
    },
    ratedCapacity: {
      type: String, // e.g. "5000 Liters / 3 Hours", "10,000 LPH"
      trim: true
    },
    specifications: {
      type: Map,
      of: String,
      default: {}
    },
    installationDate: {
      type: Date
    },
    warrantyExpiry: {
      type: Date
    },
    totalRuntimeHours: {
      type: Number,
      default: 0
    },
    currentStatus: {
      type: String,
      enum: Object.values(ASSET_STATUS),
      default: ASSET_STATUS.OPERATIONAL,
      index: true
    },
    currentHealthScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 100,
      index: true
    },
    failureRiskLevel: {
      type: String,
      enum: Object.values(FAILURE_RISK_LEVELS),
      default: FAILURE_RISK_LEVELS.LOW,
      index: true
    },
    assignedTechnicianId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastInspectionDate: {
      type: Date
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    versionKey: '__v'
  }
);

// Compound indexes for high-speed dashboard queries
assetSchema.index({ 'orgScope.cooperativeZone': 1, category: 1, currentStatus: 1 });
assetSchema.index({ criticality: 1, currentHealthScore: 1 });

export const Asset = mongoose.model('Asset', assetSchema);

