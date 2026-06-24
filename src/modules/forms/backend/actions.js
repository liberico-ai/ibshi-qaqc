import { actionRegistry } from '../../../core/action-registry.js';

export function registerFormsActions() {
  actionRegistry.register({ name: 'forms.rfi.read',       description: 'Xem RFI',                  module: 'forms' });
  actionRegistry.register({ name: 'forms.rfi.write',      description: 'Tạo/sửa RFI',              module: 'forms' });
  actionRegistry.register({ name: 'forms.painting.read',  description: 'Xem kiểm tra sơn/DFT',     module: 'forms' });
  actionRegistry.register({ name: 'forms.painting.write', description: 'Tạo/sửa kiểm tra sơn/DFT', module: 'forms' });
  actionRegistry.register({ name: 'forms.pressure.read',  description: 'Xem thử áp lực',           module: 'forms' });
  actionRegistry.register({ name: 'forms.pressure.write', description: 'Tạo/sửa thử áp lực',       module: 'forms' });
}
