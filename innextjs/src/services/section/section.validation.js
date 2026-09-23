import { z } from 'zod';

export const createSectionSchema = z.object({
  name: z.string({
    required_error: 'Name is required',
  }).min(1, 'Name cannot be empty'),
  boxId: z.string({
    required_error: 'Box ID is required',
  }).min(1, 'Box ID cannot be empty'),
});

export const updateSectionSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').optional(),
  boxId: z.string().min(1, 'Box ID cannot be empty').optional(),
});
