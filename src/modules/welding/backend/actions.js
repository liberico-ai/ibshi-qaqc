import { actionRegistry } from '../../../core/action-registry.js';

export function registerWeldingActions() {
  actionRegistry.register({ name: 'welding.wps.read',     description: 'Xem WPS/PQR',          module: 'welding' });
  actionRegistry.register({ name: 'welding.wps.write',    description: 'Quản lý WPS/PQR',      module: 'welding' });
  actionRegistry.register({ name: 'welding.welder.read',  description: 'Xem thợ hàn',          module: 'welding' });
  actionRegistry.register({ name: 'welding.welder.write', description: 'Quản lý thợ hàn',      module: 'welding' });
  actionRegistry.register({ name: 'welding.weldmap.read', description: 'Xem bản đồ mối hàn',   module: 'welding' });
  actionRegistry.register({ name: 'welding.weldmap.write',description: 'Quản lý bản đồ mối hàn',module: 'welding' });
}
