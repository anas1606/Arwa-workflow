import { z } from 'zod';

export const createPackagingSchema = z.object({
  name: z.string({
    required_error: 'Name is required',
  }).min(1, 'Name cannot be empty'),
  customerId: z.string({
    required_error: 'Customer ID is required',
  }).min(1, 'Customer ID cannot be empty'),
});

export const updatePackagingSchema = z.object({
  id: z.string({ required_error: 'Packaging ID is required' }),
  name: z.string().min(1, 'Name cannot be empty').optional(),
  customerId: z.string().min(1, 'Customer ID cannot be empty').optional(),
});
