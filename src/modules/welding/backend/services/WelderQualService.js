import { welderRepo, weldJointRepo } from '../repositories/WeldingRepository.js';
import { AppError } from '../../../../core/errors.js';

const CONTINUITY_MONTHS = 6;

/**
 * Tính số ngày giữa hôm nay và một mốc ngày (date string / Date).
 * Trả về số dương nếu mốc ở tương lai.
 */
function daysUntil(dateVal) {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

/**
 * Số tháng kể từ continuity_last_date đến hôm nay.
 */
function monthsSince(dateVal) {
  if (!dateVal) return null;
  const d = new Date(dateVal);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  return (now.getFullYear() - d.getFullYear()) * 12
    + (now.getMonth() - d.getMonth());
}

export class WelderQualService {
  /**
   * Trạng thái chứng chỉ tổng hợp của 1 thợ hàn.
   * @returns {Promise<{ status: 'VALID'|'EXPIRING'|'EXPIRED', label: string,
   *   continuityWarning: boolean, nearestExpiry: string|null }>}
   * - VALID:    còn ít nhất 1 qual còn hiệu lực > 60 ngày
   * - EXPIRING: qual gần nhất còn hiệu lực <= 60 ngày
   * - EXPIRED:  không có qual nào còn hiệu lực
   */
  static async getCertStatus(welderId) {
    const quals = await welderRepo.certStatus(welderId);
    if (!quals.length) {
      return { status: 'EXPIRED', label: 'hết hạn', continuityWarning: false, nearestExpiry: null };
    }

    let bestDays = -Infinity;
    let nearestExpiry = null;
    let continuityWarning = false;

    for (const q of quals) {
      const d = daysUntil(q.expiry_date);
      // qual không có ngày hết hạn coi như còn hiệu lực vô thời hạn
      const effDays = q.expiry_date == null ? Infinity : d;
      if (effDays > bestDays) {
        bestDays = effDays;
        nearestExpiry = q.expiry_date ?? null;
      }
      const m = monthsSince(q.continuity_last_date);
      if (m != null && m > CONTINUITY_MONTHS) continuityWarning = true;
    }

    let status, label;
    if (bestDays < 0)        { status = 'EXPIRED';  label = 'hết hạn'; }
    else if (bestDays <= 60) { status = 'EXPIRING'; label = 'sắp hết hạn'; }
    else                     { status = 'VALID';    label = 'hợp lệ'; }

    return { status, label, continuityWarning, nearestExpiry };
  }

  /**
   * Guard: có được phép gán thợ hàn này vào mối hàn không.
   * Trả về false nếu chứng chỉ đã hết hạn (block).
   */
  static async canAssignWelder(welderId) {
    const { status } = await this.getCertStatus(welderId);
    return status !== 'EXPIRED';
  }

  /**
   * Kiểm tra điều kiện chấp nhận tạo phiếu kiểm tra ngoại quan mối hàn (IP04)
   * cho một mối hàn (weld_joint_ref).
   *
   * Quy tắc CHẶN (chỉ chặn khi có bằng chứng rõ ràng):
   *   - Mối hàn có gán thợ hàn nhưng chứng chỉ đã HẾT HẠN (EXPIRED) → WELDER_NOT_QUALIFIED.
   *   - Mối hàn có gán WPS nhưng WPS chưa được duyệt (status != 'APPROVED') → WPS_NOT_APPROVED.
   *
   * KHÔNG chặn khi thiếu dữ liệu (không tìm thấy mối hàn, chưa gán thợ/WPS):
   * trả về { ok: true, skipped: true } để không cản trở luồng tạo phiếu.
   *
   * @param {string} weldJointRef - id (UUID) hoặc joint_no của mối hàn
   * @throws {AppError} 409 khi vi phạm
   */
  static async assertJointInspectable(weldJointRef) {
    const joint = await weldJointRepo.findForValidation(weldJointRef);
    // Không tìm thấy mối hàn → không chặn (dữ liệu chưa đủ).
    if (!joint) return { ok: true, skipped: true };

    // Kiểm tra WPS đã duyệt (chỉ khi mối hàn có gán WPS).
    if (joint.wps_id) {
      const wpsApproved = String(joint.wps_status || '').toUpperCase() === 'APPROVED';
      if (!wpsApproved) {
        throw new AppError(
          409,
          `WPS ${joint.wps_no || ''} của mối hàn ${joint.joint_no} chưa được phê duyệt — không thể tạo phiếu kiểm tra ngoại quan (IP04).`,
          { code: 'WPS_NOT_APPROVED', wps_id: joint.wps_id, joint_no: joint.joint_no }
        );
      }
    }

    // Kiểm tra chứng chỉ thợ hàn còn hiệu lực (chỉ khi mối hàn có gán thợ hàn).
    if (joint.welder_id) {
      const { status } = await this.getCertStatus(joint.welder_id);
      if (status === 'EXPIRED') {
        throw new AppError(
          409,
          `Thợ hàn ${joint.welder_code || ''} (${joint.welder_name || ''}) của mối hàn ${joint.joint_no} đã hết hạn chứng chỉ — không thể tạo phiếu kiểm tra ngoại quan (IP04).`,
          { code: 'WELDER_NOT_QUALIFIED', welder_id: joint.welder_id, joint_no: joint.joint_no }
        );
      }
    }

    return { ok: true, skipped: false };
  }

  static get continuityMonths() { return CONTINUITY_MONTHS; }
}
