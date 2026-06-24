import { actionRegistry } from '../../../core/action-registry.js';

export function registerCalibrationActions() {
  actionRegistry.register({ name: 'calibration.read',  description: 'Xem hiệu chuẩn thiết bị',     module: 'calibration' });
  actionRegistry.register({ name: 'calibration.write', description: 'Quản lý hiệu chuẩn thiết bị', module: 'calibration' });
}
