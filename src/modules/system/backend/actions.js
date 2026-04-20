import { actionRegistry } from '../../../core/action-registry.js';

export function registerSystemActions() {
  actionRegistry.register({ name: 'users.create', description: 'Tạo tài khoản', module: 'system' });
  actionRegistry.register({ name: 'users.read', description: 'Xem tài khoản', module: 'system' });
  actionRegistry.register({ name: 'users.update', description: 'Sửa tài khoản', module: 'system' });
  actionRegistry.register({ name: 'users.delete', description: 'Xóa tài khoản', module: 'system' });

  actionRegistry.register({ name: 'roles.create', description: 'Tạo nhóm quyền', module: 'system' });
  actionRegistry.register({ name: 'roles.read', description: 'Xem nhóm quyền', module: 'system' });
  actionRegistry.register({ name: 'roles.update', description: 'Sửa nhóm quyền', module: 'system' });
  actionRegistry.register({ name: 'roles.delete', description: 'Xóa nhóm quyền', module: 'system' });

  actionRegistry.register({ name: 'settings.manage', description: 'Cấu hình hệ thống', module: 'system' });

  actionRegistry.register({ name: 'logs.read', description: 'Xem lịch sử thao tác', module: 'system' });

  actionRegistry.register({ name: 'system.providers.read',  description: 'Xem providers',      module: 'system' });
  actionRegistry.register({ name: 'system.providers.write', description: 'Quản lý providers',   module: 'system' });
}
