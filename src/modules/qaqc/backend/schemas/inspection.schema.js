import { z } from 'zod';
import { uuidSchema } from './common.schema.js';

export const createInspectionSchema = z.object({
  plan_id: uuidSchema,
  item_id: uuidSchema,
  project_id: uuidSchema.optional(),
  unit_id: uuidSchema.optional().nullable(),
  ip_code: z.string().max(20).optional(),
  assigned_to: uuidSchema.optional().nullable(),
});

const resultRowSchema = z.object({
  checkpoint_id: uuidSchema.optional(),
  result: z.enum(['PASS', 'FAIL', 'N/A']),
  measured_value: z.number().optional().nullable(),
  device_id: z.string().max(50).optional().nullable(),
  note: z.string().max(1000).optional(),
});

export const saveResultsSchema = z.object({
  results: z.array(resultRowSchema).min(1).max(200),
});

export const signInspectionSchema = z.object({}).optional();

export const uploadPhotoSchema = z.object({
  file_url: z.string().url(),
  result_id: uuidSchema.optional().nullable(),
  taken_at: z.string().datetime({ offset: true }).optional(),
});

export const escalateSchema = z.object({
  reason: z.string().min(10).max(1000),
  assigned_to: uuidSchema.optional().nullable(),
});
