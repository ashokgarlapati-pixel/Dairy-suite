import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const inspectionSchema = new mongoose.Schema(
  {
    inspectionId: {
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
    inspectorUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    inspectionDate: {
      type: Date,
      default: Date.now,
      required: true
    },
    checklist: [
      {
        checkItem: { type: String, required: true },
        result: {
          type: String,
          enum: ['PASS', 'FAIL', 'ADVISORY'],
          default: 'PASS'
        },
        notes: String
      }
    ],
    evidencePhotos: [
      {
        url: String,
        caption: String,
        checksum: String,
        capturedAt: { type: Date, default: Date.now }
      }
    ],
    audioNotesUrl: {
      type: String
    },
    overallCondition: {
      type: String,
      enum: ['EXCELLENT', 'FAIR', 'POOR', 'CRITICAL'],
      default: 'EXCELLENT',
      index: true
    },
    followupWorkOrderRequired: {
      type: Boolean,
      default: false
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

export const Inspection = mongoose.model('Inspection', inspectionSchema);

