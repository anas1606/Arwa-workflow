import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string({
    required_error: 'Name is required',
  }).min(1, 'Name cannot be empty'),
  parentId: z.string().optional().nullable().or(z.literal('').transform(() => null)),
  isActive: z.boolean().optional().default(true),
});

export const updateCategorySchema = z.object({
  id: z.string({ required_error: 'Category ID is required' }),
  name: z.string().min(1, 'Name cannot be empty').optional(),
  parentId: z.string().optional().nullable().or(z.literal('').transform(() => null)),
  isActive: z.boolean().optional(),
});
