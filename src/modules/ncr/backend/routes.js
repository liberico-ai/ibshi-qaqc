import { NCRController }     from './controllers/NCRController.js';
import { requireAction }      from '../../../core/permission.js';
import { asyncHandler }       from '../../../core/errors.js';
import { validateSchema }     from '../../../core/validate.js';

import {
  createNCRSchema, transitionNCRSchema, assignNCRSchema,
  addActionSchema, verifyActionSchema, closeNCRSchema,
} from './schemas/ncr.schema.js';

export function registerNCRRoutes(app) {
  app.get( '/api/ncr',                  requireAction('ncr.read'),   asyncHandler(NCRController.getAll));
  app.get( '/api/ncr/:id',              requireAction('ncr.read'),   asyncHandler(NCRController.getOne));
  app.post('/api/ncr',                  requireAction('ncr.write'),  validateSchema(createNCRSchema),     asyncHandler(NCRController.create));
  app.post('/api/ncr/:id/transition',   requireAction('ncr.write'),  validateSchema(transitionNCRSchema), asyncHandler(NCRController.transition));
  app.post('/api/ncr/:id/assign',       requireAction('ncr.assign'), validateSchema(assignNCRSchema),     asyncHandler(NCRController.assign));
  app.post('/api/ncr/:id/actions',      requireAction('ncr.write'),  validateSchema(addActionSchema),     asyncHandler(NCRController.addAction));
  app.post('/api/ncr/:id/actions/:actionId/verify', requireAction('ncr.verify'), validateSchema(verifyActionSchema), asyncHandler(NCRController.verifyAction));
  app.post('/api/ncr/:id/close',        requireAction('ncr.close'),  validateSchema(closeNCRSchema),      asyncHandler(NCRController.close));
}
