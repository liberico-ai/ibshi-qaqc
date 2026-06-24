import { actionRegistry } from '../../../core/action-registry.js';

export function registerMDRActions() {
  actionRegistry.register({ name: 'mdr.read',    description: 'Xem hồ sơ MDR',        module: 'mdr' });
  actionRegistry.register({ name: 'mdr.write',   description: 'Quản lý hồ sơ MDR',    module: 'mdr' });
  actionRegistry.register({ name: 'mdr.compile', description: 'Biên dịch PDF MDR',     module: 'mdr' });
  actionRegistry.register({ name: 'mdr.submit',  description: 'Đóng gói & nộp MDR',    module: 'mdr' });
}
