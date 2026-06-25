import { registerCalibrationActions }  from './actions.js';
import { registerCalibrationMenus }    from './menus.js';
import { registerCalibrationRoutes }   from './routes.js';
import { registerCalibrationCronjobs } from './cronjobs.js';
import { hooks }                       from '../../../core/hooks.js';
import { createLogger }                from '../../../core/logger.js';
import { AppError }                    from '../../../core/errors.js';
import { calDeviceRepo }               from './repositories/CalibrationRepository.js';

const log = createLogger('calibration:hooks');

/**
 * Filter qaqc.inspection.preCreate: chặn tạo phiếu kiểm tra nếu thiết bị đo
 * (device_id) đã hết hạn hiệu chuẩn (due_date của lần hiệu chuẩn mới nhất < hôm nay).
 * Chỉ chặn khi có bằng chứng rõ ràng hết hạn; lỗi tra cứu DB / thiếu dữ liệu
 * (chưa có bản ghi hiệu chuẩn) sẽ KHÔNG chặn nhầm.
 */
function registerCalibrationInspectionHooks() {
  hooks.addFilter('qaqc.inspection.preCreate', async (payload) => {
    try {
      if (!payload || !payload.device_id) return payload;
      const st = await calDeviceRepo.calibrationStatus(payload.device_id);
      if (st.expired) {
        throw new AppError(
          409,
          'Thiết bị đã hết hạn hiệu chuẩn',
          { code: 'DEVICE_CALIBRATION_EXPIRED', device_id: payload.device_id, due_date: st.due_date }
        );
      }
    } catch (err) {
      if (err instanceof AppError) throw err;
      log.error(err, 'Calibration preCreate validation gặp lỗi không mong muốn — bỏ qua chặn');
    }
    return payload;
  });
}

export default async function registerCalibrationModule(app) {
  registerCalibrationActions();
  registerCalibrationMenus();
  registerCalibrationRoutes(app);
  registerCalibrationCronjobs();
  registerCalibrationInspectionHooks();
}
