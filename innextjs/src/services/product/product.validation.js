import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string({
    required_error: 'Name is required',
  }).min(1, 'Name cannot be empty'),
  code: z.string().optional().nullable().or(z.literal('').transform(() => null)),
  stockQuantity: z.number().nonnegative('Stock quantity must be positive').optional().default(0),
  lowStockThreshold: z.number().min(0).optional().default(10),
  categoryId: z.string().optional().nullable().or(z.literal('').transform(() => null)),
  unitId: z.string().optional().nullable().or(z.literal('').transform(() => null)),
  isActive: z.boolean().optional().default(true),
  bodyDesigns: z.array(
    z.object({
      name: z.string().min(1, 'Body Design name is required'),
      type: z.enum(['STANDARD', 'NON_STANDARD'])
    })
  ).optional(),
  colours: z.array(
    z.object({
      name: z.string().min(1, 'Colour name is required'),
      type: z.enum(['STANDARD', 'NON_STANDARD'])
    })
  ).optional(),
});

export const updateProductSchema = z.object({
  id: z.string({ required_error: 'Product ID is required' }),
  name: z.string().min(1, 'Name cannot be empty').optional(),
  code: z.string().optional().nullable().or(z.literal('').transform(() => null)),
  stockQuantity: z.number().min(0, { message: 'Stock Quantity must be a positive number' }).optional(),
  lowStockThreshold: z.number().min(0).optional().default(10),
  categoryId: z.string().optional().nullable().or(z.literal('').transform(() => null)),
  unitId: z.string().optional().nullable().or(z.literal('').transform(() => null)),
  isActive: z.boolean().optional(),
  bodyDesigns: z.array(
    z.object({
      name: z.string().min(1, 'Body Design name is required'),
      type: z.enum(['STANDARD', 'NON_STANDARD'])
    })
  ).optional(),
  colours: z.array(
    z.object({
      name: z.string().min(1, 'Colour name is required'),
      type: z.enum(['STANDARD', 'NON_STANDARD'])
    })
  ).optional(),
});
