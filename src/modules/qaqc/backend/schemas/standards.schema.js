import { z } from 'zod';
import { uuidSchema } from './common.schema.js';

export const createStandardSchema = z.object({
  standard: z.object({
    code: z.string().min(1).max(50),
    title: z.string().min(3).max(300),
    grp: z.string().max(30).optional().nullable(),
    tier: z.number().int().min(1).max(5).optional(),
    version: z.string().max(20).optional().nullable(),
    issued_date: z.string().datetime({ offset: true }).optional().nullable(),
    status: z.enum(['ACTIVE', 'DEPRECATED', 'SUPERSEDED']).default('ACTIVE'),
    description: z.string().max(5000).optional(),
  }),
  specs: z.array(z.object({
    grade: z.string().min(1).max(30),
    property: z.string().min(1).max(100),
    min_val: z.number().optional().nullable(),
    max_val: z.number().optional().nullable(),
    unit: z.string().max(20).optional(),
    test_method: z.string().max(50).optional(),
  })).max(200).optional(),
});

export const updateStandardSchema = z.object({
  code: z.string().min(1).max(50).optional(),
  title: z.string().min(3).max(300).optional(),
  grp: z.string().max(30).optional().nullable(),
  tier: z.number().int().min(1).max(5).optional(),
  version: z.string().max(20).optional().nullable(),
  issued_date: z.string().datetime({ offset: true }).optional().nullable(),
  status: z.enum(['ACTIVE', 'DEPRECATED', 'SUPERSEDED']).optional(),
  description: z.string().max(5000).optional(),
});

export const searchStandardSchema = z.object({
  query: z.string().min(1).max(200),
  filters: z.object({
    grp: z.string().max(30).optional(),
    tier: z.number().int().optional(),
    status: z.string().optional(),
  }).optional(),
});

export const supersedeSchema = z.object({
  old_standard_id: uuidSchema,
});
