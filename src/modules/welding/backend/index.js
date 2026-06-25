import { registerWeldingActions }  from './actions.js';
import { registerWeldingMenus }    from './menus.js';
import { registerWeldingRoutes }   from './routes.js';
import { registerWeldingCronjobs } from './cronjobs.js';
import { hooks }                   from '../../../core/hooks.js';
import { createLogger }            from '../../../core/logger.js';
import { AppError }                from '../../../core/errors.js';
import { WelderQualService }       from './services/WelderQualService.js';

const log = createLogger('welding:hooks');

/** Nhận diện phiếu kiểm tra ngoại quan mối hàn (IP04) theo ip_code. */
function isIP04(ipCode) {
  if (!ipCode) return false;
  return /ip[\s_-]*04/i.test(String(ipCode));
}

/**
 * Filter qaqc.inspection.preCreate: chặn tạo phiếu IP04 nếu mối hàn
 * tham chiếu (weld_joint_ref) có thợ hàn hết hạn chứng chỉ hoặc WPS chưa duyệt.
 * Chỉ chặn khi có bằng chứng rõ ràng; lỗi tra cứu DB không làm chặn nhầm.
 */
function registerWeldingInspectionHooks() {
  hooks.addFilter('qaqc.inspection.preCreate', async (payload) => {
    try {
      if (!payload || !isIP04(payload.ip_code) || !payload.weld_joint_ref) {
        return payload; // không phải case IP04/mối hàn → giữ nguyên
      }
      await WelderQualService.assertJointInspectable(payload.weld_joint_ref);
    } catch (err) {
      // AppError là quyết định chặn có chủ đích → ném tiếp ra ngoài.
      if (err instanceof AppError) throw err;
      // Lỗi tra cứu/khác → log và KHÔNG chặn để tránh cản trở nhầm.
      log.error(err, 'Welding IP04 preCreate validation gặp lỗi không mong muốn — bỏ qua chặn');
    }
    return payload;
  });
}

export default async function registerWeldingModule(app) {
  registerWeldingActions();
  registerWeldingMenus();
  registerWeldingRoutes(app);
  registerWeldingCronjobs();
  registerWeldingInspectionHooks();
}
