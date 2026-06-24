import { RfiController }      from './controllers/RfiController.js';
import { PaintingController } from './controllers/PaintingController.js';
import { PressureController } from './controllers/PressureController.js';
import { requireAction }      from '../../../core/permission.js';
import { asyncHandler }       from '../../../core/errors.js';
import { validateSchema }     from '../../../core/validate.js';
import {
  createRfiSchema, updateRfiSchema,
  createPaintingSchema, createPressureSchema,
} from './schemas/forms.schema.js';

export function registerFormsRoutes(app) {
  // RFI (ILS-QAC-F06)
  app.get( '/api/forms/rfi',      requireAction('forms.rfi.read'),  asyncHandler(RfiController.getAll));
  app.get( '/api/forms/rfi/:id',  requireAction('forms.rfi.read'),  asyncHandler(RfiController.getOne));
  app.post('/api/forms/rfi',      requireAction('forms.rfi.write'), validateSchema(createRfiSchema), asyncHandler(RfiController.create));
  app.put( '/api/forms/rfi/:id',  requireAction('forms.rfi.write'), validateSchema(updateRfiSchema), asyncHandler(RfiController.update));

  // Painting / DFT (ILS-QAC-F12)
  app.get( '/api/forms/painting',     requireAction('forms.painting.read'),  asyncHandler(PaintingController.getAll));
  app.get( '/api/forms/painting/:id', requireAction('forms.painting.read'),  asyncHandler(PaintingController.getOne));
  app.post('/api/forms/painting',     requireAction('forms.painting.write'), validateSchema(createPaintingSchema), asyncHandler(PaintingController.create));

  // Pressure Test (ILS-QAC-F14)
  app.get( '/api/forms/pressure',     requireAction('forms.pressure.read'),  asyncHandler(PressureController.getAll));
  app.get( '/api/forms/pressure/:id', requireAction('forms.pressure.read'),  asyncHandler(PressureController.getOne));
  app.post('/api/forms/pressure',     requireAction('forms.pressure.write'), validateSchema(createPressureSchema), asyncHandler(PressureController.create));
}
