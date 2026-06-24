import { NDTVendorController }  from './controllers/NDTVendorController.js';
import { NDTRequestController } from './controllers/NDTRequestController.js';
import { requireAction }        from '../../../core/permission.js';
import { asyncHandler }         from '../../../core/errors.js';
import { validateSchema }       from '../../../core/validate.js';
import {
  createVendorSchema, updateVendorSchema,
  createRequestSchema, updateStatusSchema, uploadResultSchema,
} from './schemas/ndt.schema.js';

export function registerNDTRoutes(app) {
  // ── Vendors ──────────────────────────────────────────────────
  app.get( '/api/ndt/vendors',     requireAction('ndt.request.read'),  asyncHandler(NDTVendorController.getAll));
  app.get( '/api/ndt/vendors/:id', requireAction('ndt.request.read'),  asyncHandler(NDTVendorController.getOne));
  app.post('/api/ndt/vendors',     requireAction('ndt.request.write'), validateSchema(createVendorSchema), asyncHandler(NDTVendorController.create));
  app.put( '/api/ndt/vendors/:id', requireAction('ndt.request.write'), validateSchema(updateVendorSchema), asyncHandler(NDTVendorController.update));

  // ── Requests (ILS-QAC-F11) ───────────────────────────────────
  app.get( '/api/ndt/requests',            requireAction('ndt.request.read'),  asyncHandler(NDTRequestController.getAll));
  app.get( '/api/ndt/requests/:id',        requireAction('ndt.request.read'),  asyncHandler(NDTRequestController.getOne));
  app.post('/api/ndt/requests',            requireAction('ndt.request.write'), validateSchema(createRequestSchema), asyncHandler(NDTRequestController.create));
  app.put( '/api/ndt/requests/:id/status', requireAction('ndt.request.write'), validateSchema(updateStatusSchema),  asyncHandler(NDTRequestController.updateStatus));

  // ── Results (F08 / F15) ──────────────────────────────────────
  app.post('/api/ndt/requests/:id/results', requireAction('ndt.result.write'), validateSchema(uploadResultSchema), asyncHandler(NDTRequestController.uploadResult));
}
