import { z } from 'zod';

export const createUserSchema = z.object({
  username: z.string({
    required_error: 'Username is required',
  }).min(1, 'Username cannot be empty'),
  email: z.string().email('Invalid email format').optional().nullable(),
  phone: z.string().max(10, 'Phone number cannot exceed 10 digits').optional().nullable(),
  password: z.string({
    required_error: 'Password is required',
  }).min(6, 'Password must be at least 6 characters'),
  security_role_id: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});

export const updateUserSchema = z.object({
  id: z.string({ required_error: 'User ID is required' }),
  username: z.string().min(1, 'Username cannot be empty').optional(),
  email: z.string().email('Invalid email format').optional().nullable(),
  phone: z.string().max(10, 'Phone number cannot exceed 10 digits').optional().nullable(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().nullable(),
  security_role_id: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});
