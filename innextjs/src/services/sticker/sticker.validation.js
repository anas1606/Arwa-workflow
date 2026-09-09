import { z } from 'zod';

export const createStickerSchema = z.object({
  brand_id: z.string({
    required_error: 'Brand ID is required',
  }).min(1, 'Brand ID cannot be empty'),
  name: z.string({
    required_error: 'Sticker name is required',
  }).min(1, 'Sticker name cannot be empty'),
});

export const updateStickerSchema = z.object({
  id: z.string({ required_error: 'Sticker ID is required' }),
  brand_id: z.string().min(1, 'Brand ID cannot be empty').optional(),
  name: z.string().min(1, 'Sticker name cannot be empty').optional(),
});
