import { z } from 'zod';

const uuid = z.string().uuid();

export const createWpsSchema = z.object({
  wps_no: z.string().min(1).max(100),
  project_id: uuid.optional().nullable(),
  process: z.string().max(50).optional().nullable(),
  base_metal: z.string().max(200).optional().nullable(),
  position: z.string().max(50).optional().nullable(),
  thickness_range: z.string().max(100).optional().nullable(),
  status: z.enum(['DRAFT', 'APPROVED', 'OBSOLETE']).optional(),
});

export const updateWpsSchema = createWpsSchema.partial();

export const createPqrSchema = z.object({
  pqr_no: z.string().min(1).max(100),
  wps_id: uuid.optional().nullable(),
  test_result: z.enum(['PASS', 'FAIL']).optional(),
});

export const createWelderSchema = z.object({
  welder_code: z.string().min(1).max(50),
  full_name: z.string().min(1).max(200),
  stamp_no: z.string().max(50).optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const updateWelderSchema = createWelderSchema.partial();

export const addQualSchema = z.object({
  process: z.string().max(50).optional().nullable(),
  position: z.string().max(50).optional().nullable(),
  thickness_min: z.number().nonnegative().optional().nullable(),
  thickness_max: z.number().nonnegative().optional().nullable(),
  cert_no: z.string().max(100).optional().nullable(),
  qualified_date: z.string().optional().nullable(),
  expiry_date: z.string().optional().nullable(),
  continuity_last_date: z.string().optional().nullable(),
});

export const createWeldMapSchema = z.object({
  project_id: uuid.optional().nullable(),
  drawing_no: z.string().max(100).optional().nullable(),
  name: z.string().max(200).optional().nullable(),
});

export const addJointSchema = z.object({
  joint_no: z.string().min(1).max(50),
  wps_id: uuid.optional().nullable(),
  welder_id: uuid.optional().nullable(),
  ndt_required: z.boolean().optional(),
  status: z.enum(['PLANNED', 'WELDED', 'ACCEPTED', 'REJECTED']).optional(),
});

export const updateJointSchema = z.object({
  wps_id: uuid.optional().nullable(),
  welder_id: uuid.optional().nullable(),
  ndt_required: z.boolean().optional(),
  status: z.enum(['PLANNED', 'WELDED', 'ACCEPTED', 'REJECTED']).optional(),
});
