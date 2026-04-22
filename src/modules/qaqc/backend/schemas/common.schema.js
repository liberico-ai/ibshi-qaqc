import { z } from 'zod';

export const uuidSchema = z.string().uuid();
export const isoDateSchema = z.string().datetime({ offset: true });
export const ipCodeSchema = z.string().regex(/^IP\d{2,4}$/);
export const heatNumberSchema = z.string().min(3).max(30);

export const itpStatusSchema = z.enum([
  'DRAFT', 'UNDER_REVIEW', 'MANAGER_APPROVED', 'DIRECTOR_APPROVED',
  'ACTIVE', 'SUPERSEDED', 'ARCHIVED',
]);

export const mirStageSchema = z.enum([
  'EXPECTED', 'DOC_RECEIVED', 'PHYSICAL_INSPECTED', 'MTC_VERIFIED', 'DECIDED', 'INSTOCK',
]);

export const holdTypeSchema = z.enum(['NONE', 'W', 'H', 'HC']);
