// SLA tracking cho NCR (BR03.01)
// Suy hạn SLA mặc định theo mức độ nghiêm trọng và tính trạng thái SLA theo màu.

// Số ngày SLA mặc định theo mức độ
export const SLA_DAYS_BY_SEVERITY = {
  critical: 3,
  major:    7,
  minor:    14,
};

const AT_RISK_DAYS = 2; // còn ≤ 2 ngày → cảnh báo (amber)

/**
 * Suy hạn SLA (Date) từ mức độ nghiêm trọng kể từ một mốc thời gian.
 * @param {string} severity  minor|major|critical
 * @param {Date}   [from=now]
 * @returns {Date}
 */
export function deriveSlaDueDate(severity, from = new Date()) {
  const days = SLA_DAYS_BY_SEVERITY[severity] ?? SLA_DAYS_BY_SEVERITY.minor;
  const due = new Date(from);
  due.setHours(0, 0, 0, 0);
  due.setDate(due.getDate() + days);
  return due;
}

/**
 * Tính trạng thái SLA cho một NCR.
 *  - CLOSED   : NCR đã đóng (status = CLOSED)
 *  - ON_TIME  : còn > 2 ngày tới hạn (green)
 *  - AT_RISK  : còn ≤ 2 ngày tới hạn (amber)
 *  - OVERDUE  : đã quá hạn (red)
 *  - null     : không có hạn SLA để đánh giá
 * @param {{ status?:string, sla_due_date?:string|Date|null, due_date?:string|Date|null }} ncr
 * @param {Date} [now]
 * @returns {string|null}
 */
export function computeSlaStatus(ncr, now = new Date()) {
  if (!ncr) return null;
  if (ncr.status === 'CLOSED') return 'CLOSED';

  const dueRaw = ncr.sla_due_date ?? ncr.due_date;
  if (!dueRaw) return null;

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueRaw);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.round((due - today) / 86400000);
  if (diffDays < 0) return 'OVERDUE';
  if (diffDays <= AT_RISK_DAYS) return 'AT_RISK';
  return 'ON_TIME';
}

/**
 * Gắn thêm trường sla_status (đã tính) vào 1 record NCR.
 */
export function withSlaStatus(ncr, now = new Date()) {
  if (!ncr) return ncr;
  return { ...ncr, sla_status: computeSlaStatus(ncr, now) };
}
