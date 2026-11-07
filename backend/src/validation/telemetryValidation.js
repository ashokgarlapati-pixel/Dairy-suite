import { z } from 'zod';

export const telemetryMetricTypes = [
  'TEMPERATURE',
  'DISCHARGE_PRESSURE',
  'SUCTION_PRESSURE',
  'VIBRATION_RMS',
  'CIP_FLOW_RATE',
  'MOTOR_CURRENT_AMPS',
  'AGITATOR_RPM'
];

export const singleTelemetryReadingSchema = z.object({
  assetId: z.string({ required_error: 'Asset ID is required' }),
  sensorId: z.string({ required_error: 'Sensor ID is required' }).trim(),
  metricType: z.enum(telemetryMetricTypes, {
    required_error: 'Valid metric type is required'
  }),
  metricValue: z.number({ required_error: 'Metric value is required' }),
  unit: z.string({ required_error: 'Unit is required' }),
  timestamp: z.string().or(z.date()).optional().default(() => new Date()),
  thresholdRange: z
    .object({
      normalMin: z.number().optional(),
      normalMax: z.number().optional()
    })
    .optional(),
  orgScope: z
    .object({
      cooperativeZone: z.string().optional(),
      plantId: z.string().optional(),
      centerId: z.string().optional()
    })
    .optional()
});

export const bulkTelemetryIngestSchema = z.object({
  readings: z
    .array(singleTelemetryReadingSchema)
    .min(1, 'At least one telemetry reading is required')
});

export const queryTelemetrySchema = z.object({
  metricType: z.enum(telemetryMetricTypes).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 50)),
  hours: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 24))
});

