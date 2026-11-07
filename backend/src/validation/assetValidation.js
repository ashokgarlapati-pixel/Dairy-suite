import { z } from 'zod';
import { ASSET_CATEGORIES, ASSET_CRITICALITY, ASSET_STATUS, FAILURE_RISK_LEVELS } from '../config/constants.js';

export const createAssetSchema = z.object({
  assetTag: z
    .string({ required_error: 'Asset tag is required' })
    .min(3, 'Asset tag must be at least 3 characters')
    .max(30, 'Asset tag cannot exceed 30 characters')
    .trim(),
  name: z
    .string({ required_error: 'Asset name is required' })
    .min(2, 'Asset name must be at least 2 characters')
    .max(100, 'Asset name cannot exceed 100 characters')
    .trim(),
  category: z.nativeEnum(ASSET_CATEGORIES, {
    required_error: 'Valid asset category is required'
  }),
  owner: z
    .object({
      ownerType: z.enum(['COOPERATIVE', 'CONTRACTOR', 'VILLAGE_SOCIETY']).default('COOPERATIVE'),
      ownerName: z.string().trim().default('Dairy Union Federation'),
      contactPhone: z.string().optional()
    })
    .default({}),
  orgScope: z.object({
    cooperativeZone: z.string({ required_error: 'Cooperative zone is required' }),
    plantId: z.string().optional(),
    centerId: z.string().optional()
  }),
  location: z.object({
    facilityName: z.string({ required_error: 'Facility name is required' }),
    department: z.string().optional(),
    building: z.string().optional(),
    gpsCoordinates: z
      .object({
        lat: z.number().optional(),
        lng: z.number().optional()
      })
      .optional()
  }),
  criticality: z.nativeEnum(ASSET_CRITICALITY).default(ASSET_CRITICALITY.MEDIUM_P2),
  ratedCapacity: z.string().optional(),
  specifications: z.record(z.string()).optional(),
  installationDate: z.string().or(z.date()).optional(),
  warrantyExpiry: z.string().or(z.date()).optional(),
  totalRuntimeHours: z.number().min(0).default(0),
  currentStatus: z.nativeEnum(ASSET_STATUS).default(ASSET_STATUS.OPERATIONAL),
  currentHealthScore: z.number().min(0).max(100).default(100),
  failureRiskLevel: z.nativeEnum(FAILURE_RISK_LEVELS).default(FAILURE_RISK_LEVELS.LOW),
  assignedTechnicianId: z.string().optional()
});

export const updateAssetSchema = createAssetSchema.partial();

export const queryAssetsSchema = z.object({
  page: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z.string().optional().transform((val) => (val ? parseInt(val, 10) : 12)),
  search: z.string().optional(),
  category: z.nativeEnum(ASSET_CATEGORIES).optional(),
  currentStatus: z.nativeEnum(ASSET_STATUS).optional(),
  criticality: z.nativeEnum(ASSET_CRITICALITY).optional(),
  failureRiskLevel: z.nativeEnum(FAILURE_RISK_LEVELS).optional(),
  cooperativeZone: z.string().optional(),
  plantId: z.string().optional(),
  centerId: z.string().optional(),
  ownerType: z.enum(['COOPERATIVE', 'CONTRACTOR', 'VILLAGE_SOCIETY']).optional(),
  owner: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

