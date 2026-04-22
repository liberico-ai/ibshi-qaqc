import { ProjectsController }          from './controllers/ProjectsController.js';
import { StandardsController }         from './controllers/StandardsController.js';
import { StandardsLookupController }   from './controllers/StandardsLookupController.js';
import { StandardsImportController, uploadMiddleware } from './controllers/StandardsImportController.js';
import { ITPController }               from './controllers/ITPController.js';
import { InspectionController }        from './controllers/InspectionController.js';
import { MIRController }               from './controllers/MIRController.js';
import { requireAction }               from '../../../core/permission.js';
import { asyncHandler }                from '../../../core/errors.js';
import { validateSchema }              from '../../../core/validate.js';
import { holdPointGuard }              from './middleware/holdPointGuard.js';

import {
  createITPSchema, updateITPSchema, addITPItemSchema,
  itpTransitionSchema, itpCopySchema, releaseHoldSchema, overrideHoldSchema,
} from './schemas/itp.schema.js';
import {
  createInspectionSchema, saveResultsSchema, signInspectionSchema,
  uploadPhotoSchema, escalateSchema,
} from './schemas/inspection.schema.js';
import {
  createMIRSchema, uploadMTCSchema, recordPhysicalSchema,
  crossCheckSchema, decideSchema, warehouseSchema,
} from './schemas/mir.schema.js';
import {
  createStandardSchema, updateStandardSchema, searchStandardSchema, supersedeSchema,
} from './schemas/standards.schema.js';

export function registerQAQCRoutes(app) {
  // Projects
  app.get( '/api/qaqc/projects',      requireAction('qaqc.projects.read'), asyncHandler(ProjectsController.getAll));
  app.post('/api/qaqc/projects/sync', requireAction('qaqc.projects.sync'), asyncHandler(ProjectsController.sync));

  // Standards Lookup
  app.get( '/api/qaqc/standards-lookup',                               requireAction('qaqc.standards.read'), asyncHandler(StandardsLookupController.getStandards));
  app.get( '/api/qaqc/standards-lookup/equivalents',                   requireAction('qaqc.standards.read'), asyncHandler(StandardsLookupController.getEquivalents));
  app.post('/api/qaqc/standards-lookup/compare',                       requireAction('qaqc.standards.read'), asyncHandler(StandardsLookupController.compare));
  app.post('/api/qaqc/standards-lookup/ai-search',                     requireAction('qaqc.standards.read'), asyncHandler(StandardsLookupController.aiSearch));
  app.post('/api/qaqc/standards-lookup/feedback',                      requireAction('qaqc.standards.read'), asyncHandler(StandardsLookupController.submitFeedback));
  app.get( '/api/qaqc/standards-lookup/:standardCode/grades/:grade',   requireAction('qaqc.standards.read'), asyncHandler(StandardsLookupController.getGrade));

  // Standards Import — multer handles file uploads (no JSON body schema)
  app.post('/api/qaqc/standards/import',          requireAction('qaqc.standards.write'), uploadMiddleware, asyncHandler(StandardsImportController.enqueue));
  app.get( '/api/qaqc/standards/import/jobs',     requireAction('qaqc.standards.write'), asyncHandler(StandardsImportController.listJobs));
  app.get( '/api/qaqc/standards/import/jobs/:id', requireAction('qaqc.standards.write'), asyncHandler(StandardsImportController.getJob));
  app.post('/api/qaqc/standards/import/jobs/:id/retry', requireAction('qaqc.standards.write'), asyncHandler(StandardsImportController.retryJob));
  app.post('/api/qaqc/standards/:standardId/supersede', requireAction('qaqc.standards.write'), validateSchema(supersedeSchema), asyncHandler(StandardsImportController.supersede));

  // Standards KB
  app.get( '/api/qaqc/standards',              requireAction('qaqc.standards.read'),  asyncHandler(StandardsController.getAll));
  app.get( '/api/qaqc/standards/templates',    requireAction('qaqc.itp.read'),        asyncHandler(ITPController.getTemplates));
  app.post('/api/qaqc/standards/search',       requireAction('qaqc.standards.read'),  validateSchema(searchStandardSchema), asyncHandler(StandardsController.search));
  app.get( '/api/qaqc/standards/:id',          requireAction('qaqc.standards.read'),  asyncHandler(StandardsController.getOne));
  app.post('/api/qaqc/standards',              requireAction('qaqc.standards.write'), validateSchema(createStandardSchema), asyncHandler(StandardsController.create));
  app.put( '/api/qaqc/standards/:id',          requireAction('qaqc.standards.write'), validateSchema(updateStandardSchema), asyncHandler(StandardsController.update));
  app.post('/api/qaqc/standards/:id/deprecate',requireAction('qaqc.standards.write'), asyncHandler(StandardsController.deprecate));
  app.get( '/api/qaqc/standards/:id/specs',    requireAction('qaqc.standards.read'),  asyncHandler(StandardsController.getSpecs));

  // ITP
  app.get( '/api/qaqc/itp',              requireAction('qaqc.itp.read'),    asyncHandler(ITPController.getAll));
  app.get( '/api/qaqc/itp/pending-holds',requireAction('qaqc.itp.read'),    asyncHandler(ITPController.getPendingHolds));
  app.get( '/api/qaqc/itp/:id',          requireAction('qaqc.itp.read'),    asyncHandler(ITPController.getOne));
  app.post('/api/qaqc/itp',              requireAction('qaqc.itp.write'),   validateSchema(createITPSchema),     asyncHandler(ITPController.create));
  app.put( '/api/qaqc/itp/:id',          requireAction('qaqc.itp.write'),   validateSchema(updateITPSchema),     asyncHandler(ITPController.update));
  app.post('/api/qaqc/itp/:id/submit',   requireAction('qaqc.itp.write'),   asyncHandler(ITPController.submit));
  app.post('/api/qaqc/itp/:id/approve',  requireAction('qaqc.itp.approve'), validateSchema(itpTransitionSchema), asyncHandler(ITPController.approve));
  app.post('/api/qaqc/itp/:id/activate', requireAction('qaqc.itp.approve'), asyncHandler(ITPController.activate));
  app.post('/api/qaqc/itp/:id/copy',     requireAction('qaqc.itp.write'),   validateSchema(itpCopySchema),       asyncHandler(ITPController.copy));
  app.post('/api/qaqc/itp/:id/items',    requireAction('qaqc.itp.write'),   validateSchema(addITPItemSchema),    asyncHandler(ITPController.addItem));
  app.delete('/api/qaqc/itp/:id/items/:itemId', requireAction('qaqc.itp.write'), asyncHandler(ITPController.removeItem));
  app.get( '/api/qaqc/itp/:planId/hold-status', requireAction('qaqc.itp.read'),  asyncHandler(ITPController.getHoldStatus));
  app.post('/api/qaqc/itp/items/:itemId/release',
    requireAction('qaqc.itp.approve'),
    validateSchema(releaseHoldSchema),
    asyncHandler(ITPController.releaseHoldPoint)
  );
  app.post('/api/qaqc/itp/items/:itemId/override',
    requireAction('qaqc.hold.override'),
    validateSchema(overrideHoldSchema),
    asyncHandler(ITPController.overrideHoldPoint)
  );

  // Inspections
  app.get( '/api/qaqc/inspections/dashboard',   requireAction('qaqc.inspection.read'),    asyncHandler(InspectionController.getDashboard));
  app.get( '/api/qaqc/inspections',             requireAction('qaqc.inspection.read'),    asyncHandler(InspectionController.getAll));
  app.get( '/api/qaqc/inspections/:id',         requireAction('qaqc.inspection.read'),    asyncHandler(InspectionController.getOne));
  app.post('/api/qaqc/inspections',             requireAction('qaqc.inspection.execute'), validateSchema(createInspectionSchema), asyncHandler(holdPointGuard), asyncHandler(InspectionController.create));
  app.put( '/api/qaqc/inspections/:id/results', requireAction('qaqc.inspection.execute'), validateSchema(saveResultsSchema),      asyncHandler(InspectionController.saveResults));
  app.post('/api/qaqc/inspections/:id/sign',    requireAction('qaqc.inspection.sign'),    validateSchema(signInspectionSchema),   asyncHandler(InspectionController.sign));
  app.post('/api/qaqc/inspections/:id/photos',  requireAction('qaqc.inspection.execute'), validateSchema(uploadPhotoSchema),      asyncHandler(InspectionController.uploadPhoto));
  app.post('/api/qaqc/inspections/:id/escalate',requireAction('qaqc.inspection.sign'),    validateSchema(escalateSchema),         asyncHandler(InspectionController.escalate));
  app.post('/api/qaqc/inspections/:id/revise',            requireAction('qaqc.inspection.execute'), asyncHandler(InspectionController.createRevision));
  app.get( '/api/qaqc/inspections/:id/revisions',         requireAction('qaqc.inspection.read'),    asyncHandler(InspectionController.listRevisions));
  app.get( '/api/qaqc/inspections/:fromId/diff/:toId',    requireAction('qaqc.inspection.read'),    asyncHandler(InspectionController.diffRevisions));

  // MIR
  app.get( '/api/qaqc/mir/export',         requireAction('qaqc.mir.read'),      asyncHandler(MIRController.exportExcel));
  app.get( '/api/qaqc/mir',                requireAction('qaqc.mir.read'),      asyncHandler(MIRController.getAll));
  app.get( '/api/qaqc/mir/:id',            requireAction('qaqc.mir.read'),      asyncHandler(MIRController.getOne));
  app.post('/api/qaqc/mir',                requireAction('qaqc.mir.write'),     validateSchema(createMIRSchema),      asyncHandler(MIRController.create));
  app.post('/api/qaqc/mir/:id/upload-mtc', requireAction('qaqc.mir.write'),     validateSchema(uploadMTCSchema),      asyncHandler(MIRController.uploadMTC));
  app.post('/api/qaqc/mir/:id/physical',   requireAction('qaqc.mir.write'),     validateSchema(recordPhysicalSchema), asyncHandler(MIRController.recordPhysical));
  app.post('/api/qaqc/mir/:id/crosscheck', requireAction('qaqc.mir.write'),     validateSchema(crossCheckSchema),     asyncHandler(MIRController.crossCheck));
  app.post('/api/qaqc/mir/:id/decide',     requireAction('qaqc.mir.decide'),    validateSchema(decideSchema),         asyncHandler(MIRController.decide));
  app.post('/api/qaqc/mir/:id/warehouse',  requireAction('qaqc.mir.warehouse'), validateSchema(warehouseSchema),      asyncHandler(MIRController.warehouseEntry));
  app.get( '/api/qaqc/mir/:id/audit',      requireAction('qaqc.mir.read'),      asyncHandler(MIRController.getAudit));
}
