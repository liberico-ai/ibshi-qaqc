import { actionRegistry } from '../../../core/action-registry.js';

export function registerDashboardActions() {
  actionRegistry.register({ name: 'dashboard.qc.read',   description: 'Xem KPI chất lượng (QC)',  module: 'dashboard' });
  actionRegistry.register({ name: 'dashboard.mgmt.read', description: 'Xem tổng quan quản lý',    module: 'dashboard' });
}
