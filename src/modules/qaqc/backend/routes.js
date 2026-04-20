import { ProjectsController }          from './controllers/ProjectsController.js';
import { StandardsController }         from './controllers/StandardsController.js';
import { StandardsLookupController }   from './controllers/StandardsLookupController.js';
import { ITPController }               from './controllers/ITPController.js';
import { InspectionController }        from './controllers/InspectionController.js';
import { MIRController }               from './controllers/MIRController.js';
import { requireAction }               from '../../../core/permission.js';
import { asyncHandler }                from '../../../core/errors.js';

export function registerQAQCRoutes(app) {
  // Projects
  app.get( '/api/qaqc/projects',      requireAction('qaqc.projects.read'), asyncHandler(ProjectsController.getAll));
  app.post('/api/qaqc/projects/sync', requireAction('qaqc.projects.sync'), asyncHandler(ProjectsController.sync));

  // Standards Lookup
  app.get( '/api/qaqc/standards-lookup',                               requireAction('qaqc.standards.read'), asyncHandler(StandardsLookupController.getStandards));
  app.get( '/api/qaqc/standards-lookup/equivalents',                   requireAction('qaqc.standards.read'), asyncHandler(StandardsLookupController.getEquivalents));
  app.post('/api/qaqc/standards-lookup/compare',                       requireAction('qaqc.standards.read'), asyncHandler(StandardsLookupController.compare));
  app.get( '/api/qaqc/standards-lookup/:standardCode/grades/:grade',   requireAction('qaqc.standards.read'), asyncHandler(StandardsLookupController.getGrade));

  // Standards KB
  app.get( '/api/qaqc/standards',              requireAction('qaqc.standards.read'),  asyncHandler(StandardsController.getAll));
  app.get( '/api/qaqc/standards/templates',    requireAction('qaqc.itp.read'),        asyncHandler(ITPController.getTemplates));
  app.post('/api/qaqc/standards/search',       requireAction('qaqc.standards.read'),  asyncHandler(StandardsController.search));
  app.get( '/api/qaqc/standards/:id',          requireAction('qaqc.standards.read'),  asyncHandler(StandardsController.getOne));
  app.post('/api/qaqc/standards',              requireAction('qaqc.standards.write'), asyncHandler(StandardsController.create));
  app.put( '/api/qaqc/standards/:id',          requireAction('qaqc.standards.write'), asyncHandler(StandardsController.update));
  app.post('/api/qaqc/standards/:id/deprecate',requireAction('qaqc.standards.write'), asyncHandler(StandardsController.deprecate));
  app.get( '/api/qaqc/standards/:id/specs',    requireAction('qaqc.standards.read'),  asyncHandler(StandardsController.getSpecs));

  // ITP
  app.get( '/api/qaqc/itp',              requireAction('qaqc.itp.read'),    asyncHandler(ITPController.getAll));
  app.get( '/api/qaqc/itp/:id',          requireAction('qaqc.itp.read'),    asyncHandler(ITPController.getOne));
  app.post('/api/qaqc/itp',              requireAction('qaqc.itp.write'),   asyncHandler(ITPController.create));
  app.put( '/api/qaqc/itp/:id',          requireAction('qaqc.itp.write'),   asyncHandler(ITPController.update));
  app.post('/api/qaqc/itp/:id/submit',   requireAction('qaqc.itp.write'),   asyncHandler(ITPController.submit));
  app.post('/api/qaqc/itp/:id/approve',  requireAction('qaqc.itp.approve'), asyncHandler(ITPController.approve));
  app.post('/api/qaqc/itp/:id/activate', requireAction('qaqc.itp.approve'), asyncHandler(ITPController.activate));
  app.post('/api/qaqc/itp/:id/copy',            requireAction('qaqc.itp.write'),   asyncHandler(ITPController.copy));
  app.post('/api/qaqc/itp/:id/items',           requireAction('qaqc.itp.write'),   asyncHandler(ITPController.addItem));
  app.delete('/api/qaqc/itp/:id/items/:itemId', requireAction('qaqc.itp.write'),   asyncHandler(ITPController.removeItem));

  // Inspections
  app.get( '/api/qaqc/inspections/dashboard', requireAction('qaqc.inspection.read'),    asyncHandler(InspectionController.getDashboard));
  app.get( '/api/qaqc/inspections',           requireAction('qaqc.inspection.read'),    asyncHandler(InspectionController.getAll));
  app.get( '/api/qaqc/inspections/:id',       requireAction('qaqc.inspection.read'),    asyncHandler(InspectionController.getOne));
  app.post('/api/qaqc/inspections',           requireAction('qaqc.inspection.execute'), asyncHandler(InspectionController.create));
  app.put( '/api/qaqc/inspections/:id/results', requireAction('qaqc.inspection.execute'), asyncHandler(InspectionController.saveResults));
  app.post('/api/qaqc/inspections/:id/sign',    requireAction('qaqc.inspection.sign'),    asyncHandler(InspectionController.sign));
  app.post('/api/qaqc/inspections/:id/photos',  requireAction('qaqc.inspection.execute'), asyncHandler(InspectionController.uploadPhoto));
  app.post('/api/qaqc/inspections/:id/escalate',requireAction('qaqc.inspection.sign'),    asyncHandler(InspectionController.escalate));

  // MIR
  app.get( '/api/qaqc/mir/export',          requireAction('qaqc.mir.read'),      asyncHandler(MIRController.exportExcel));
  app.get( '/api/qaqc/mir',                 requireAction('qaqc.mir.read'),      asyncHandler(MIRController.getAll));
  app.get( '/api/qaqc/mir/:id',             requireAction('qaqc.mir.read'),      asyncHandler(MIRController.getOne));
  app.post('/api/qaqc/mir',                 requireAction('qaqc.mir.write'),     asyncHandler(MIRController.create));
  app.post('/api/qaqc/mir/:id/upload-mtc',  requireAction('qaqc.mir.write'),     asyncHandler(MIRController.uploadMTC));
  app.post('/api/qaqc/mir/:id/physical',    requireAction('qaqc.mir.write'),     asyncHandler(MIRController.recordPhysical));
  app.post('/api/qaqc/mir/:id/crosscheck',  requireAction('qaqc.mir.write'),     asyncHandler(MIRController.crossCheck));
  app.post('/api/qaqc/mir/:id/decide',      requireAction('qaqc.mir.decide'),    asyncHandler(MIRController.decide));
  app.post('/api/qaqc/mir/:id/warehouse',   requireAction('qaqc.mir.warehouse'), asyncHandler(MIRController.warehouseEntry));
  app.get( '/api/qaqc/mir/:id/audit',       requireAction('qaqc.mir.read'),      asyncHandler(MIRController.getAudit));
}
