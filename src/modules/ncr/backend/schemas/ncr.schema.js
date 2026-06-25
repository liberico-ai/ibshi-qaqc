import { z } from 'zod';

const uuidSchema = z.string().uuid();

export const createNCRSchema = z.object({
  project_id:          uuidSchema.optional().nullable(),
  title:               z.string().min(3).max(300),
  description:         z.string().max(5000).optional().nullable(),
  source_type:         z.enum(['inspection', 'mir', 'manual']).default('manual'),
  source_ref_id:       uuidSchema.optional().nullable(),
  severity:            z.enum(['minor', 'major', 'critical']).default('minor'),
  root_cause_category: z.string().max(50).optional().nullable(),
  assigned_to:         z.number().int().positive().optional().nullable(),
  due_date:            z.string().optional().nullable(),
  sla_due_date:        z.string().optional().nullable(),
  hold_flag:           z.boolean().optional(),
});

export const transitionNCRSchema = z.object({
  to_status: z.enum([
    'OPEN', 'ASSIGNED', 'ROOT_CAUSE', 'CAPA_PLAN',
    'IN_PROGRESS', 'VERIFY', 'CLOSED', 'REOPEN',
  ]),
  note:                z.string().max(2000).optional().nullable(),
  assigned_to:         z.number().int().positive().optional().nullable(),
  root_cause_category: z.string().max(50).optional().nullable(),
});

export const assignNCRSchema = z.object({
  assigned_to: z.number().int().positive(),
  due_date:    z.string().optional().nullable(),
  note:        z.string().max(2000).optional().nullable(),
});

export const addActionSchema = z.object({
  action_type: z.enum(['corrective', 'preventive']).default('corrective'),
  description: z.string().min(3).max(2000),
  owner_id:    z.number().int().positive().optional().nullable(),
  due_date:    z.string().optional().nullable(),
});

export const verifyActionSchema = z.object({
  status: z.enum(['open', 'in_progress', 'done', 'verified']).default('verified'),
  note:   z.string().max(2000).optional().nullable(),
});

export const closeNCRSchema = z.object({
  note: z.string().max(2000).optional().nullable(),
});
