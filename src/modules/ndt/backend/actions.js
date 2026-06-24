import { actionRegistry } from '../../../core/action-registry.js';

export function registerNDTActions() {
  actionRegistry.register({ name: 'ndt.request.read',  description: 'Xem yêu cầu NDT',          module: 'ndt' });
  actionRegistry.register({ name: 'ndt.request.write', description: 'Tạo/sửa yêu cầu NDT',      module: 'ndt' });
  actionRegistry.register({ name: 'ndt.result.read',   description: 'Xem kết quả NDT',          module: 'ndt' });
  actionRegistry.register({ name: 'ndt.result.write',  description: 'Cập nhật kết quả NDT',     module: 'ndt' });
  actionRegistry.register({ name: 'ndt.vendor',        description: 'Nhà thầu NDT (giới hạn)',  module: 'ndt' });
}
