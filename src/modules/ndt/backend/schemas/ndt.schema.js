import { z } from 'zod';

const uuid = z.string().uuid();

export const createVendorSchema = z.object({
  name: z.string().min(1).max(200),
  contact_email: z.string().email().max(200).optional().nullable(),
  is_approved: z.boolean().optional(),
});

export const updateVendorSchema = createVendorSchema.partial();

export const createRequestSchema = z.object({
  request_no: z.string().min(1).max(100),
  project_id: uuid.optional().nullable(),
  method: z.enum(['RT', 'UT', 'MT', 'PT']),
  inspection_id: uuid.optional().nullable(),
  weld_joint_ref: z.number().int().optional().nullable(),
  vendor_id: uuid.optional().nullable(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['REQUESTED', 'SENT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
});

export const uploadResultSchema = z.object({
  result: z.enum(['accept', 'reject']),
  report_no: z.string().max(100).optional().nullable(),
  file_link: z.string().url().max(2000).optional().nullable(),
});
