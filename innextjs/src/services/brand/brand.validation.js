import { z } from 'zod';

export const createBrandSchema = z.object({
  brandname: z.string({
    required_error: 'Brand name is required',
  }).min(1, 'Brand name cannot be empty'),
  customer_id: z.string({
    required_error: 'Customer ID is required',
  }).min(1, 'Customer ID cannot be empty'),
  description: z.string().optional().or(z.literal('')),
});

export const updateBrandSchema = z.object({
  id: z.string({ required_error: 'Brand ID is required' }),
  brandname: z.string().min(1, 'Brand name cannot be empty').optional(),
  customer_id: z.string().min(1, 'Customer ID cannot be empty').optional(),
  description: z.string().optional().or(z.literal('')),
});
