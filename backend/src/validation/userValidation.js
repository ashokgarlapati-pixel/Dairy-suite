import { z } from 'zod';
import { ROLES } from '../config/constants.js';

export const createUserSchema = z.object({
  fullName: z
    .string({ required_error: 'Full name is required' })
    .min(2, 'Full name must be at least 2 characters')
    .trim(),
  email: z
    .string({ required_error: 'Email address is required' })
    .email('Invalid email address format')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Initial password is required' })
    .min(6, 'Password must be at least 6 characters'),
  role: z.nativeEnum(ROLES, { required_error: 'Valid application role is required' }),
  phone: z.string().optional().default('+91 98450 00000'),
  orgScope: z
    .object({
      cooperativeZone: z.string().default('Southern District Union'),
      assignedPlants: z.array(z.string()).default(['Plant-Central (Mysore)']),
      assignedCenters: z.array(z.string()).default(['VCC-MYSORE-01'])
    })
    .default({})
});

export const updateUserSchema = z.object({
  fullName: z.string().min(2).optional(),
  role: z.nativeEnum(ROLES).optional(),
  phone: z.string().optional(),
  orgScope: z
    .object({
      cooperativeZone: z.string().optional(),
      assignedPlants: z.array(z.string()).optional(),
      assignedCenters: z.array(z.string()).optional()
    })
    .optional(),
  accountStatus: z.enum(['ACTIVE', 'DEACTIVATED', 'SUSPENDED']).optional()
});
