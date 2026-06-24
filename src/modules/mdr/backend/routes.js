import { MDRController }  from './controllers/MDRController.js';
import { requireAction }   from '../../../core/permission.js';
import { asyncHandler }    from '../../../core/errors.js';
import { validateSchema }  from '../../../core/validate.js';

import {
  createDossierSchema, addDocumentSchema, updateDocumentSchema,
  transmittalSchema, buildSubmissionSchema,
} from './schemas/mdr.schema.js';

export function registerMDRRoutes(app) {
  app.get( '/api/mdr',                  requireAction('mdr.read'),    asyncHandler(MDRController.getAll));
  app.get( '/api/mdr/:id',              requireAction('mdr.read'),    asyncHandler(MDRController.getOne));
  app.post('/api/mdr',                  requireAction('mdr.write'),   validateSchema(createDossierSchema), asyncHandler(MDRController.create));
  app.post('/api/mdr/:id/scan',         requireAction('mdr.read'),    asyncHandler(MDRController.scan));
  app.get( '/api/mdr/:id/missing',      requireAction('mdr.read'),    asyncHandler(MDRController.missing));
  app.post('/api/mdr/:id/documents',    requireAction('mdr.write'),   validateSchema(addDocumentSchema),    asyncHandler(MDRController.addDocument));
  app.put( '/api/mdr/:id/documents/:docId', requireAction('mdr.write'), validateSchema(updateDocumentSchema), asyncHandler(MDRController.updateDocument));
  app.get( '/api/mdr/:id/transmittals', requireAction('mdr.read'),    asyncHandler(MDRController.listTransmittals));
  app.post('/api/mdr/:id/transmittals', requireAction('mdr.write'),   validateSchema(transmittalSchema),    asyncHandler(MDRController.createTransmittal));
  app.post('/api/mdr/:id/compile',      requireAction('mdr.compile'), asyncHandler(MDRController.compile));
  app.post('/api/mdr/:id/submit',       requireAction('mdr.submit'),  validateSchema(buildSubmissionSchema), asyncHandler(MDRController.submit));
}
