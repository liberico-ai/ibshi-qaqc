import { PortalController } from './controllers/PortalController.js';
import { requireAction } from '../../../core/permission.js';
import { asyncHandler } from '../../../core/errors.js';

export function registerPortalRoutes(app) {
  app.get('/api/portal/projects',                       requireAction('portal.view'), asyncHandler(PortalController.getProjects));
  app.get('/api/portal/projects/:projectId/summary',    requireAction('portal.view'), asyncHandler(PortalController.getProjectSummary));
}
