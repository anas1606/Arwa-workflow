import { z } from 'zod';

export const createBoxSchema = z.object({
  name: z.string({
    required_error: 'Name is required',
  }).min(1, 'Name cannot be empty'),
  sections: z.array(
    z.object({
      name: z.string().min(1, 'Section name cannot be empty'),
      trays: z.array(
        z.object({
          name: z.string().min(1, 'Tray name cannot be empty')
        })
      ).optional().default([])
    })
  ).optional().default([])
});

export const updateBoxSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').optional(),
  sections: z.array(
    z.object({
      id: z.union([z.string(), z.number()]).optional(), // string for existing, number for new (from frontend Date.now())
      name: z.string().min(1, 'Section name cannot be empty'),
      trays: z.array(
        z.object({
          id: z.union([z.string(), z.number()]).optional(),
          name: z.string().min(1, 'Tray name cannot be empty')
        })
      ).optional().default([])
    })
  ).optional()
});
