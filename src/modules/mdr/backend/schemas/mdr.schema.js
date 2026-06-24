import { z } from 'zod';

const uuidSchema = z.string().uuid();

export const createDossierSchema = z.object({
  project_id: uuidSchema.optional().nullable(),
  name:       z.string().min(3).max(300),
});

export const addDocumentSchema = z.object({
  category_id:   uuidSchema,
  doc_name:      z.string().min(1).max(300),
  file_link:     z.string().url().optional().nullable(),
  source_module: z.string().max(50).optional().nullable(),
  status:        z.enum(['present', 'missing']).optional(),
});

export const updateDocumentSchema = z.object({
  doc_name:   z.string().min(1).max(300).optional(),
  file_link:  z.string().url().optional().nullable(),
  status:     z.enum(['present', 'missing']).optional(),
});

export const transmittalSchema = z.object({
  client:   z.string().min(1).max(200),
  purpose:  z.string().max(300).optional().nullable(),
  remarks:  z.string().max(2000).optional().nullable(),
});

export const buildSubmissionSchema = z.object({
  client: z.string().min(1).max(200),
});
