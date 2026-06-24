import { actionRegistry } from '../../../core/action-registry.js';

export function registerPortalActions() {
  actionRegistry.register({ name: 'portal.view', description: 'Truy cập cổng khách hàng (chỉ đọc)', module: 'portal' });
}
