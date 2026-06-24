import { DashboardController } from './controllers/DashboardController.js';
import { requireAction } from '../../../core/permission.js';
import { asyncHandler } from '../../../core/errors.js';

export function registerDashboardRoutes(app) {
  app.get('/api/dashboard/qc-kpi',     requireAction('dashboard.qc.read'),   asyncHandler(DashboardController.getQcKpi));
  app.get('/api/dashboard/projects',   requireAction('dashboard.qc.read'),   asyncHandler(DashboardController.getProjectDashboard));
  app.get('/api/dashboard/management', requireAction('dashboard.mgmt.read'), asyncHandler(DashboardController.getManagementOverview));
  app.get('/api/dashboard/report',     requireAction('dashboard.qc.read'),   asyncHandler(DashboardController.exportReport));
}
