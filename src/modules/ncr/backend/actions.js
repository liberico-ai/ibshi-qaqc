import { actionRegistry } from '../../../core/action-registry.js';

export function registerNCRActions() {
  actionRegistry.register({ name: 'ncr.read',   description: 'Xem NCR',                 module: 'ncr' });
  actionRegistry.register({ name: 'ncr.write',  description: 'Tạo/sửa NCR',             module: 'ncr' });
  actionRegistry.register({ name: 'ncr.assign', description: 'Giao xử lý NCR',          module: 'ncr' });
  actionRegistry.register({ name: 'ncr.verify', description: 'Xác minh hành động CAPA', module: 'ncr' });
  actionRegistry.register({ name: 'ncr.close',  description: 'Đóng NCR',                module: 'ncr' });
}
