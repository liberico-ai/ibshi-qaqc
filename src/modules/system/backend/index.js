import { registerSystemActions } from './actions.js';
import { registerSystemRoutes } from './routes.js';
import { registerSystemMenus } from './menus.js';
import { registerSystemCronjobs } from './cronjobs.js';
import { SettingsService } from '../../../core/settings.js';
import { auditLog } from '../../../core/audit-log.js';

export default async function registerSystemModule(app) {
  // 1. Phân quyền: Đăng ký các quyền hạn (Actions/Permissions) mà module này có
  registerSystemActions();

  // 2. Menu: Đăng ký các menu của module này
  registerSystemMenus();

  // 3. Định tuyến: Tích hợp Controller & API của module vào Express App
  registerSystemRoutes(app);

  // 4. Cronjobs: Đăng ký các tiến trình chạy ngầm
  registerSystemCronjobs();

  // 5. Đồng bộ cấu hình audit log từ DB khi khởi động
  try {
    const { data } = await SettingsService.getAllSettings();
    auditLog.syncFromSettings(data);
  } catch {
    // DB chưa sẵn sàng (first run) — dùng default
  }
}
