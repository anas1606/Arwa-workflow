import { z } from 'zod';

export const createBoxSchema = z.object({
  name: z.string({
    required_error: 'Name is required',
  }).min(1, 'Name cannot be empty'),
});

export const updateBoxSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').optional(),
});
