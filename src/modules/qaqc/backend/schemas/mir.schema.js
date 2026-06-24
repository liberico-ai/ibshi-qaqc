import { z } from 'zod';
import { uuidSchema, heatNumberSchema } from './common.schema.js';

export const createMIRSchema = z.object({
  project_id: uuidSchema,
  po_ref: z.string().min(1).max(50),
  supplier_id: uuidSchema,
  po_line_ids: z.array(uuidSchema).min(1).max(100),
});

export const uploadMTCSchema = z.object({
  standard_id: uuidSchema.optional().nullable(),
  heat_no: heatNumberSchema.optional(),
  grade: z.string().max(30).optional(),
  supplier: z.string().max(100).optional(),
  file_url: z.string().url().optional(),
  ocr_extracted: z.record(z.unknown()).optional(),
});

export const recordPhysicalSchema = z.object({
  heat_no: heatNumberSchema,
  grade: z.string().min(1).max(30),
  quantity: z.number().positive(),
  unit: z.string().min(1).max(10),
  notes: z.string().max(500).optional(),
});

export const crossCheckSchema = z.object({
  standard_id: uuidSchema.optional().nullable(),
});

export const decideSchema = z.object({
  decision: z.enum(['ACCEPT', 'REJECT', 'WAIVER']),
  waiver_note: z.string().min(10).max(2000).optional().nullable(),
  ai_result: z.record(z.unknown()).optional().nullable(),
  // PIN ký số — bắt buộc để xác nhận quyết định nghiệm thu vật tư.
  pin: z.string().min(4).max(12),
});

export const warehouseSchema = z.object({
  location: z.string().min(1).max(100),
  notes: z.string().max(500).optional(),
});
