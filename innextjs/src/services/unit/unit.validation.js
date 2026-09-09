import { z } from 'zod';

export const createUnitSchema = z.object({
  name: z.string({
    required_error: 'Name is required',
  }).min(1, 'Name cannot be empty'),
  shortName: z.string().optional().or(z.literal('')),
  quantityUnit: z.number().int().min(1, 'Quantity unit must be at least 1').optional(),
});

export const updateUnitSchema = z.object({
  id: z.string({ required_error: 'Unit ID is required' }),
  name: z.string().min(1, 'Name cannot be empty').optional(),
  shortName: z.string().optional().or(z.literal('')),
  quantityUnit: z.number().int().min(1, 'Quantity unit must be at least 1').optional(),
  status: z.boolean().optional(),
});
