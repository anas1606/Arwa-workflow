import { z } from 'zod';

const orderLineSchema = z.object({
  id: z.string().optional(),
  productId: z.string({ required_error: 'Product ID is required' }),
  quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
  
  bodyDesignId: z.string().optional().or(z.literal('')),
  colourId: z.string().optional().or(z.literal('')),
  brandId: z.string().optional().or(z.literal('')),
  stickerId: z.string().optional().or(z.literal('')),
  
  accessoriesType: z.enum(['STANDARD', 'CUSTOMIZE']).default('STANDARD'),
  accessoriesNote: z.string().optional().or(z.literal('')),
  
  packingType: z.enum(['STANDARD', 'CUSTOMIZE']).default('STANDARD'),
  packingNote: z.string().optional().or(z.literal('')),
  packagingId: z.string().optional().or(z.literal('')),
});

export const createOrderSchema = z.object({
  customerId: z.string({ required_error: 'Customer ID is required' }),
  dueDate: z.string().or(z.date()),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH']).default('NORMAL'),
  remark: z.string().optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'COMPLETED', 'CANCELLED']).default('DRAFT'),
  orderLines: z.array(orderLineSchema).min(1, 'At least one product is required'),
});

export const updateOrderSchema = z.object({
  id: z.string({ required_error: 'Order ID is required' }),
  customerId: z.string().optional(),
  dueDate: z.string().or(z.date()).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH']).optional(),
  remark: z.string().optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'COMPLETED', 'CANCELLED']).optional(),
  orderLines: z.array(orderLineSchema).optional(),
});
