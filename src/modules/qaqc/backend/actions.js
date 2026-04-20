import { actionRegistry } from '../../../core/action-registry.js';

export function registerQAQCActions() {
  actionRegistry.register({ name: 'qaqc.projects.read',  description: 'Xem dự án',         module: 'qaqc' });
  actionRegistry.register({ name: 'qaqc.projects.sync',  description: 'Đồng bộ dự án ERP', module: 'qaqc' });

  actionRegistry.register({ name: 'qaqc.standards.read',   description: 'Xem tiêu chuẩn',        module: 'qaqc' });
  actionRegistry.register({ name: 'qaqc.standards.write',  description: 'Quản lý tiêu chuẩn',    module: 'qaqc' });
  actionRegistry.register({ name: 'qaqc.standards.import', description: 'Import tiêu chuẩn',     module: 'qaqc' });

  actionRegistry.register({ name: 'qaqc.itp.read',    description: 'Xem ITP',        module: 'qaqc' });
  actionRegistry.register({ name: 'qaqc.itp.write',   description: 'Quản lý ITP',    module: 'qaqc' });
  actionRegistry.register({ name: 'qaqc.itp.approve', description: 'Phê duyệt ITP',  module: 'qaqc' });

  actionRegistry.register({ name: 'qaqc.inspection.read',    description: 'Xem kết quả kiểm tra',     module: 'qaqc' });
  actionRegistry.register({ name: 'qaqc.inspection.execute', description: 'Thực hiện kiểm tra',       module: 'qaqc' });
  actionRegistry.register({ name: 'qaqc.inspection.sign',    description: 'Ký số kết quả kiểm tra',   module: 'qaqc' });

  actionRegistry.register({ name: 'qaqc.mir.read',      description: 'Xem MIR',               module: 'qaqc' });
  actionRegistry.register({ name: 'qaqc.mir.write',     description: 'Tạo/sửa MIR',           module: 'qaqc' });
  actionRegistry.register({ name: 'qaqc.mir.decide',    description: 'Quyết định MIR',         module: 'qaqc' });
  actionRegistry.register({ name: 'qaqc.mir.warehouse', description: 'Nhập kho MIR',           module: 'qaqc' });
}
