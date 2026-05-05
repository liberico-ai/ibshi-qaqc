import { z } from 'zod';
import { uuidSchema, holdTypeSchema } from './common.schema.js';

const itpItemRowSchema = z.object({
  seq: z.number().int().min(1).optional(),
  ip_code: z.string().min(1).max(20),
  description: z.string().max(500).optional(),
  standard_id: uuidSchema.optional().nullable(),
  hold_type: holdTypeSchema.default('NONE'),
  witness_flag: z.boolean().default(false),
  release_required_role: z.string().max(20).optional().nullable(),
});

export const createITPSchema = z.object({
  project_id: uuidSchema,
  name: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  product_type: z.string().max(50).optional(),
  plan: z.record(z.unknown()).optional(),
  items: z.array(itpItemRowSchema).min(1).max(50).optional(),
});

export const updateITPSchema = createITPSchema.partial().omit({ project_id: true });

export const addITPItemSchema = z.object({
  seq: z.number().int().min(1),
  ip_code: z.string().min(1).max(20),
  description: z.string().max(500).optional(),
  standard_id: uuidSchema.optional().nullable(),
  hold_type: holdTypeSchema.default('NONE'),
  witness_flag: z.boolean().default(false),
  release_required_role: z.string().max(20).optional().nullable(),
});

export const itpTransitionSchema = z.object({
  targetStatus: z.string().min(1).max(30),
  comment: z.string().max(500).optional(),
});

export const itpCopySchema = z.object({
  targetProjectId: uuidSchema,
});

export const releaseHoldSchema = z.object({
  comment: z.string().min(20, 'Nhận xét tối thiểu 20 ký tự').max(2000),
});

export const overrideHoldSchema = z.object({
  reason: z.string().min(50, 'Lý do override tối thiểu 50 ký tự').max(2000),
});
