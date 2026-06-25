import { registerNDTActions } from './actions.js';
import { registerNDTMenus }   from './menus.js';
import { registerNDTRoutes }  from './routes.js';
import { hooks } from '../../../core/hooks.js';
import { createLogger } from '../../../core/logger.js';
import { ndtRequestRepo } from './repositories/NDTRepository.js';

const log = createLogger('ndt');

// IP05 = mã điểm kiểm tra NDT (Non-Destructive Testing) trong ITP/Inspection của qaqc.
// Khi một inspection IP05/NDT được tạo → tự sinh 1 yêu cầu NDT nháp liên kết ngược.
const NDT_IP_RE = /IP-?0?5|NDT/i;

/** Sinh số yêu cầu NDT tự động dạng NDT-YYYY-#### (đếm theo năm). */
async function nextRequestNo() {
  const year = new Date().getFullYear();
  const { rows } = await ndtRequestRepo.query(
    `SELECT COUNT(*)::int AS c FROM ndt_requests WHERE request_no LIKE $1`,
    [`NDT-${year}-%`]
  );
  const seq = String(rows[0].c + 1).padStart(4, '0');
  return `NDT-${year}-${seq}`;
}

/**
 * Handler IP05: tạo yêu cầu NDT nháp từ inspection vừa tạo + thông báo QC.
 * Non-critical: lỗi ở đây KHÔNG được chặn việc tạo inspection của qaqc.
 */
async function onInspectionCreated(record) {
  if (!record?.ip_code || !NDT_IP_RE.test(record.ip_code)) return;

  // Tránh tạo trùng nếu đã có yêu cầu gắn với inspection này.
  const exists = await ndtRequestRepo.exists({ inspection_id: record.id });
  if (exists) return;

  const requestNo = await nextRequestNo();
  const req = await ndtRequestRepo.create({
    request_no:           requestNo,
    project_id:           record.project_id ?? null,
    method:               'RT',                  // mặc định RT, QC chỉnh lại khi xử lý nháp
    inspection_id:        record.id,
    weld_joint_ref:       record.weld_joint_ref ?? null,
    status:               'REQUESTED',           // nháp — chưa gửi nhà thầu
    auto_from_inspection: true,
  });

  log.info({ inspectionId: record.id, requestNo }, 'Tự tạo yêu cầu NDT nháp từ IP05');

  // Thông báo QC để hoàn thiện & gửi nhà thầu
  await hooks.doAction('qaqc.notification.event', {
    eventType: 'NDT_DRAFT_FROM_IP05',
    payload: {
      title:   `Yêu cầu NDT nháp ${requestNo} (từ IP05)`,
      message: `Đã tự tạo yêu cầu NDT nháp ${requestNo} từ điểm kiểm tra ${record.ip_code}. Vui lòng chọn phương pháp/nhà thầu và gửi đi.`,
      link:    `/ndt/requests/${req.id}`,
      requestId: req.id,
      inspectionId: record.id,
    },
    userIds: [record.assigned_to].filter(Boolean),
  });

  return req;
}

export default async function registerNDTModule(app) {
  registerNDTActions();
  registerNDTMenus();
  registerNDTRoutes(app);

  // Tích hợp IP05/NDT — đăng ký non-critical để không chặn pipeline tạo inspection.
  hooks.addAction('qaqc.inspection.created', onInspectionCreated, { critical: false });
}
