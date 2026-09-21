import { z } from 'zod';

export const createCustomisationSchema = z.object({
  name: z.string({
    required_error: 'Name is required',
  }).min(1, 'Name cannot be empty'),
  code: z.string().optional().nullable().or(z.literal('').transform(() => null)),
  categoryId: z.string().optional().nullable().or(z.literal('').transform(() => null)),
  isActive: z.boolean().optional().default(true),
});

export const updateCustomisationSchema = z.object({
  id: z.string({ required_error: 'Customisation ID is required' }),
  name: z.string().min(1, 'Name cannot be empty').optional(),
  code: z.string().optional().nullable().or(z.literal('').transform(() => null)),
  categoryId: z.string().optional().nullable().or(z.literal('').transform(() => null)),
  isActive: z.boolean().optional(),
});
