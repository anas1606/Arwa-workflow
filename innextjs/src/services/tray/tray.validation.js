import { z } from 'zod';

export const createTraySchema = z.object({
  name: z.string({
    required_error: 'Name is required',
  }).min(1, 'Name cannot be empty'),
  sectionId: z.string({
    required_error: 'Section ID is required',
  }).min(1, 'Section ID cannot be empty'),
});

export const updateTraySchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').optional(),
  sectionId: z.string().min(1, 'Section ID cannot be empty').optional(),
});
