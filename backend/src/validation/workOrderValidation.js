import { z } from 'zod';
import { WORK_ORDER_PRIORITY, WORK_ORDER_STATUS } from '../config/constants.js';

export const createWorkOrderSchema = z.object({
  assetId: z.string({ required_error: 'Asset ID is required' }),
  title: z
    .string({ required_error: 'Work order title is required' })
    .min(3, 'Title must be at least 3 characters')
    .max(120, 'Title cannot exceed 120 characters')
    .trim(),
  description: z
    .string({ required_error: 'Detailed work description is required' })
    .min(5, 'Description must be at least 5 characters')
    .trim(),
  priority: z.nativeEnum(WORK_ORDER_PRIORITY).default(WORK_ORDER_PRIORITY.MEDIUM_P2),
  source: z.enum(['MANUAL', 'PREVENTIVE_SCHEDULE', 'AI_PREDICTIVE_TRIGGER']).default('MANUAL'),
  assignedTechnicianId: z.string().optional(),
  scheduledStartDate: z.string().or(z.date()).optional(),
  scheduledEndDate: z.string().or(z.date()).optional(),
  requiredSkills: z.array(z.string()).optional().default([]),
  partsRequired: z
    .array(
      z.object({
        partName: z.string().min(1, 'Part name is required'),
        quantityReserved: z.number().min(1).default(1),
        unitCost: z.number().min(0).default(0)
      })
    )
    .optional()
    .default([]),
  estimatedDowntimeHours: z.number().min(0).default(0),
  orgScope: z
    .object({
      cooperativeZone: z.string().optional(),
      plantId: z.string().optional(),
      centerId: z.string().optional()
    })
    .optional()
});

export const updateWorkOrderStatusSchema = z.object({
  status: z.nativeEnum(WORK_ORDER_STATUS, { required_error: 'New status is required' }),
  reason: z.string().optional().default('Status transition updated by user'),
  notes: z.string().optional()
});

export const uploadEvidenceSchema = z.object({
  summaryOfWork: z.string().min(3, 'Summary of work performed is required'),
  photos: z.array(z.string()).optional().default([]),
  audioNotesUrl: z.string().optional(),
  gpsCoordinates: z
    .object({
      lat: z.number().optional(),
      lng: z.number().optional()
    })
    .optional(),
  checklistResults: z
    .array(
      z.object({
        item: z.string(),
        result: z.enum(['PASS', 'FAIL', 'ADVISORY', 'FLAG']),
        notes: z.string().optional()
      })
    )
    .optional()
    .default([]),
  partsConsumed: z
    .array(
      z.object({
        partName: z.string(),
        quantityConsumed: z.number().min(0)
      })
    )
    .optional()
    .default([])
});

export const verifyClosureSchema = z.object({
  decision: z.enum(['APPROVED', 'REJECTED'], {
    required_error: 'Supervisor decision (APPROVED or REJECTED) is required'
  }),
  supervisorNotes: z.string().min(3, 'Supervisor verification notes are required'),
  signoffSignatureName: z.string().min(2, 'Authorized supervisor signature is required')
});

