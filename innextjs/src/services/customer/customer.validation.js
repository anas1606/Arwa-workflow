import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string({
    required_error: 'Name is required',
  }).min(1, 'Name cannot be empty'),
  email: z
    .string()
    .email('Not a valid email')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .max(15, 'Phone number cannot exceed 15 characters')
    .optional()
    .or(z.literal('')),
  balance: z.number().min(0, 'Balance must be positive').optional(),
  code: z.string().optional().or(z.literal('')),
  region: z.string().optional().or(z.literal('')),
});

export const updateCustomerSchema = z.object({
  id: z.string({ required_error: 'Customer ID is required' }),
  name: z.string().min(1, 'Name cannot be empty').optional(),
  email: z
    .string()
    .email('Not a valid email')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .max(15, 'Phone number cannot exceed 15 characters')
    .optional()
    .or(z.literal('')),
  balance: z.number().min(0, 'Balance must be positive').optional(),
  code: z.string().optional().or(z.literal('')),
  region: z.string().optional().or(z.literal('')),
});
