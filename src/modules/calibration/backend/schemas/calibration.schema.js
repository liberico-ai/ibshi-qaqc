import { z } from 'zod';

export const createMasterSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  owner_dept: z.string().max(150).optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
});

export const createDeviceSchema = z.object({
  master_id: z.string().uuid().optional().nullable(),
  device_code: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  type: z.string().max(100).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'RETIRED']).optional(),
});

export const updateDeviceSchema = createDeviceSchema.partial();

export const createRecordSchema = z.object({
  device_id: z.string().uuid(),
  calibrated_date: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  certificate_no: z.string().max(150).optional().nullable(),
  result: z.enum(['PASS', 'FAIL', 'ADJUSTED']).optional().nullable(),
  calibrated_by: z.string().max(200).optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
});
