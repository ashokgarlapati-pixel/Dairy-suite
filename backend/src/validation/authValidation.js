import { z } from 'zod';
import { ROLES } from '../config/constants.js';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid cooperative email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  rememberMe: z.boolean().optional().default(false)
});

export const registerSchema = z.object({
  email: z.string().email('Please enter a valid cooperative email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  fullName: z.string().min(2, 'Full name is required (min 2 characters)'),
  role: z.enum(Object.values(ROLES), {
    errorMap: () => ({ message: `Role must be one of: ${Object.values(ROLES).join(', ')}` })
  }),
  orgScope: z
    .object({
      cooperativeZone: z.string().default('Southern District Union'),
      assignedPlants: z.array(z.string()).optional().default([]),
      assignedCenters: z.array(z.string()).optional().default([])
    })
    .optional(),
  phone: z.string().optional()
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid cooperative email address')
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
});

