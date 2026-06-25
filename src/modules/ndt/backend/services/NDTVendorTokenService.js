import crypto from 'crypto';
import { ndtVendorTokenRepo, ndtRequestRepo, ndtResultRepo } from '../repositories/NDTRepository.js';
import { AppError } from '../../../../core/errors.js';
import { hooks } from '../../../../core/hooks.js';

// Token nhà thầu mặc định sống 14 ngày
const DEFAULT_TTL_DAYS = 14;

export class NDTVendorTokenService {
  /**
   * Sinh token phạm vi cho 1 yêu cầu NDT gửi nhà thầu.
   * @param {string} requestId
   * @param {string|null} vendorId
   * @param {number} [ttlDays]
   * @returns {Promise<{ token:string, expires_at:Date, id:string }>}
   */
  static async generate(requestId, vendorId = null, ttlDays = DEFAULT_TTL_DAYS) {
    const reqRow = await ndtRequestRepo.findOne(requestId);
    if (!reqRow) throw new AppError(404, 'Không tìm thấy yêu cầu NDT');

    const token = crypto.randomBytes(32).toString('hex'); // 64 ký tự hex
    const expiresAt = new Date(Date.now() + ttlDays * 86400000);

    const row = await ndtVendorTokenRepo.create({
      request_id: requestId,
      token,
      vendor_id: vendorId ?? reqRow.vendor_id ?? null,
      expires_at: expiresAt,
    });

    return { id: row.id, token: row.token, expires_at: row.expires_at };
  }

  /**
   * Xác thực token: phải tồn tại, chưa hết hạn, chưa dùng.
   * @returns {Promise<object>} bản ghi token (kèm thông tin request)
   */
  static async verify(token) {
    if (!token || typeof token !== 'string') {
      throw new AppError(400, 'Thiếu token nhà thầu');
    }
    const row = await ndtVendorTokenRepo.findByToken(token);
    if (!row) throw new AppError(401, 'Token không hợp lệ');
    if (row.used_at) throw new AppError(410, 'Token đã được sử dụng');
    if (new Date(row.expires_at) < new Date()) throw new AppError(410, 'Token đã hết hạn');
    return row;
  }

  /**
   * Nhà thầu nộp kết quả NDT bằng token (KHÔNG đăng nhập đầy đủ).
   * Token chỉ cho phép cập nhật đúng yêu cầu NDT gắn với nó, dùng 1 lần.
   * @param {string} token
   * @param {{ result:'accept'|'reject', report_no?:string, file_link?:string }} data
   */
  static async submitResultWithToken(token, data) {
    const tokenRow = await this.verify(token);
    const requestId = tokenRow.request_id;

    const result = await ndtResultRepo.create({
      request_id: requestId,
      result: data.result,
      report_no: data.report_no ?? null,
      file_link: data.file_link ?? null,
      recorded_by: null, // nhà thầu ngoài hệ thống — không có sys_users.id
    });

    // Đánh dấu token đã dùng + chuyển yêu cầu sang COMPLETED
    await ndtVendorTokenRepo.markUsed(tokenRow.id);
    await ndtRequestRepo.update(requestId, { status: 'COMPLETED' });

    // Đồng bộ ngược về inspection liên kết (IP05) nếu có
    await syncInspectionFromResult(requestId, tokenRow.inspection_id, data.result, tokenRow.request_no);

    // Thông báo kết quả cho QC nội bộ
    await hooks.doAction('qaqc.notification.event', {
      eventType: data.result === 'reject' ? 'NDT_RESULT_REJECTED' : 'NDT_RESULT_ACCEPTED',
      payload: {
        title:   `Kết quả NDT ${tokenRow.request_no}: ${data.result === 'reject' ? 'Không đạt' : 'Đạt'}`,
        message: `Nhà thầu đã nộp kết quả (báo cáo ${data.report_no ?? '—'}) cho yêu cầu ${tokenRow.request_no} qua token.`,
        link:    `/ndt/requests/${requestId}`,
        inspectionId: tokenRow.inspection_id,
        weldJointRef: tokenRow.weld_joint_ref,
      },
      userIds: [tokenRow.requested_by].filter(Boolean),
    });

    return result;
  }
}

/**
 * Cập nhật trạng thái inspection liên kết khi có kết quả NDT.
 * Theo yêu cầu: dùng UPDATE SQL có tham số trực tiếp lên qaqc_inspections (được phép),
 * KHÔNG sửa file qaqc. accept → PASSED, reject → FAILED.
 * Import động pool để tránh phụ thuộc vòng và để file tự kiểm tra cú pháp độc lập.
 */
export async function syncInspectionFromResult(requestId, inspectionId, result, requestNo) {
  if (!inspectionId) return;
  const { pool } = await import('../../../../core/db.js');
  const newStatus = result === 'reject' ? 'FAILED' : 'PASSED';
  await pool.query(
    `UPDATE qaqc_inspections SET status = $1, updated_at = now() WHERE id = $2`,
    [newStatus, inspectionId]
  );
}
