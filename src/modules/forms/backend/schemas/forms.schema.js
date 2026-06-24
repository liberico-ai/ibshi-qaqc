import { z } from 'zod';

const uuid = z.string().uuid();

// ── RFI (ILS-QAC-F06) ─────────────────────────────────────────
export const createRfiSchema = z.object({
  rfi_no: z.string().min(1).max(100),
  project_id: uuid.optional().nullable(),
  type: z.enum(['internal', 'external']).default('internal'),
  inspection_point: z.string().max(200).optional().nullable(),
  assigned_to: z.number().int().optional().nullable(),
  scheduled_at: z.string().optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
});
export const updateRfiSchema = z.object({
  inspection_point: z.string().max(200).optional().nullable(),
  type: z.enum(['internal', 'external']).optional(),
  assigned_to: z.number().int().optional().nullable(),
  status: z.enum(['OPEN', 'SCHEDULED', 'DONE', 'CLOSED', 'REJECTED']).optional(),
  scheduled_at: z.string().optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
});

// ── Painting / DFT (ILS-QAC-F12) ──────────────────────────────
export const createPaintingSchema = z.object({
  project_id: uuid.optional().nullable(),
  area: z.string().max(200).optional().nullable(),
  dft_reading: z.number().optional().nullable(),
  dft_min: z.number().optional().nullable(),
  dft_max: z.number().optional().nullable(),
  surface_prep: z.string().max(100).optional().nullable(),
  inspected_at: z.string().optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
});

// ── Pressure Test (ILS-QAC-F14) ───────────────────────────────
export const createPressureSchema = z.object({
  project_id: uuid.optional().nullable(),
  test_no: z.string().min(1).max(100),
  medium: z.enum(['hydro', 'pneumatic']).default('hydro'),
  pressure_value: z.number().optional().nullable(),
  hold_time: z.string().max(50).optional().nullable(),
  result: z.enum(['PASS', 'FAIL']).optional().nullable(),
  certificate_no: z.string().max(150).optional().nullable(),
  tested_at: z.string().optional().nullable(),
  note: z.string().max(2000).optional().nullable(),
});
