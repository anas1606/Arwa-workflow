import { z } from 'zod';

const JobWorkStatusEnum = z.enum([
    'CREATED',
    'CONFIRMED',
    'IN_PROGRESS',
    'PAUSED',
    'COMPLETED',
    'CANCELLED'
]);

export const jobWorkItemSchema = z.object({
    productId: z.string({ required_error: 'Product ID is required for job work items' }),
    requiredQty: z.number().min(0).default(0),
    allocatedQty: z.number().min(0).default(0)
});

export const createJobWorkSchema = z.object({
    productId: z.string({ required_error: 'Main Product ID is required' }),
    quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
    status: JobWorkStatusEnum.optional(),
    parentJobWorkId: z.string().optional().nullable(),
    bomId: z.string().optional().nullable(),
    autoCascade: z.boolean().optional(),
    items: z.array(jobWorkItemSchema).optional()
});

export const updateJobWorkSchema = z.object({
    productId: z.string().optional(),
    quantity: z.number().min(0.01).optional(),
    status: JobWorkStatusEnum.optional(),
    parentJobWorkId: z.string().optional().nullable(),
    bomId: z.string().optional().nullable(),
    items: z.array(jobWorkItemSchema).optional()
});
