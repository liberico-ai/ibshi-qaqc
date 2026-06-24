import { welderRepo } from '../repositories/WeldingRepository.js';

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

  static get continuityMonths() { return CONTINUITY_MONTHS; }
}
