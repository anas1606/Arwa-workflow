import { z } from 'zod';

export const createBomSchema = z.object({
  name: z.string({
    required_error: 'Name is required',
  }).min(1, 'Name cannot be empty'),
  productId: z.string({
    required_error: 'Main Product is required',
  }).min(1, 'Main Product is required'),
  note: z.string().optional().nullable(),
  items: z.array(
    z.object({
      productId: z.string().min(1, 'Product is required for BOM item'),
      quantity: z.number().positive('Quantity must be greater than 0')
    })
  ).min(1, 'At least one item is required for the BOM')
});

export const updateBomSchema = z.object({
  id: z.string({ required_error: 'BOM ID is required' }),
  name: z.string().min(1, 'Name cannot be empty').optional(),
  productId: z.string().min(1, 'Main Product is required').optional(),
  note: z.string().optional().nullable(),
  items: z.array(
    z.object({
      productId: z.string().min(1, 'Product is required for BOM item'),
      quantity: z.number().positive('Quantity must be greater than 0')
    })
  ).min(1, 'At least one item is required for the BOM').optional()
});
