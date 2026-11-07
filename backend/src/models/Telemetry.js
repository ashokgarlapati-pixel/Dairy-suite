import mongoose from 'mongoose';

const telemetrySchema = new mongoose.Schema(
  {
    assetId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset',
      required: true,
      index: true
    },
    sensorId: {
      type: String,
      required: true,
      trim: true
    },
    metricType: {
      type: String,
      enum: [
        'TEMPERATURE',
        'DISCHARGE_PRESSURE',
        'SUCTION_PRESSURE',
        'VIBRATION_RMS',
        'CIP_FLOW_RATE',
        'MOTOR_CURRENT_AMPS',
        'AGITATOR_RPM'
      ],
      required: true,
      index: true
    },
    metricValue: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      required: true // °C, bar, mm/s, L/min, A, RPM
    },
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
      index: true
    },
    isAnomaly: {
      type: Boolean,
      default: false,
      index: true
    },
    thresholdRange: {
      normalMin: Number,
      normalMax: Number
    },
    orgScope: {
      cooperativeZone: String,
      plantId: String,
      centerId: String
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// High-speed compound indexes for live sensor charts and anomaly queries
telemetrySchema.index({ assetId: 1, timestamp: -1 });
telemetrySchema.index({ assetId: 1, metricType: 1, timestamp: -1 });

export const Telemetry = mongoose.model('Telemetry', telemetrySchema);

