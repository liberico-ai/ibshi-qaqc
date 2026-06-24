import { hooks } from '../../../core/hooks.js';

/**
 * Hợp nhất menu theo mockup IBS QA/QC Platform.
 *
 * Các module đăng ký menu rời rạc qua filter `system.menus` (mỗi module một
 * "section"). Việc này gây trùng lặp tên nhóm (nhiều section "QAQC") và thứ tự
 * lộn xộn. Bộ hợp nhất này chạy SAU CÙNG (priority lớn) để gom toàn bộ item vào
 * đúng 5 nhóm của mockup, sắp xếp lại và gắn badge — KHÔNG cần sửa menus.js của
 * từng module, và GIỮ NGUYÊN permission của từng item (lọc quyền vẫn do
 * MenusController đảm nhiệm sau bước này).
 *
 *   1. Tổng quan            (Dashboard, Dự án)
 *   2. Quản lý chất lượng    (Inspection, NCR, MDR, ITP/RFI, Welding, NDT, MIR…)
 *   3. Biểu mẫu & Hồ sơ      (Digital Forms, Procedures/Standards, Calibration)
 *   4. AI & Tự động          (AI Assistant — nếu có)
 *   5. Hệ thống              (Báo cáo, Người dùng, Cài đặt, Logs…)
 */

const GROUPS = [
  { id: 'overview',  section: 'Tổng quan',           order: 1 },
  { id: 'quality',   section: 'Quản lý chất lượng',  order: 2 },
  { id: 'records',   section: 'Biểu mẫu & Hồ sơ',    order: 3 },
  { id: 'ai',        section: 'AI & Tự động',        order: 4 },
  { id: 'system',    section: 'Hệ thống',            order: 5 },
];

/**
 * Quyết định item thuộc nhóm nào dựa trên đường dẫn `to` (hoặc `href`).
 * Trả về id nhóm trong GROUPS.
 */
function classify(item) {
  const path = (item.to || item.href || '').toLowerCase();
  const label = (item.label || '').toLowerCase();

  // Tổng quan
  if (path === '/' || path.startsWith('/dashboard') || /tổng quan|dashboard/.test(label)) return 'overview';
  if (path.startsWith('/qaqc/projects') || path.startsWith('/portal')) return 'overview';

  // AI & Tự động
  if (path.includes('/ai') || /\bai\b|trợ lý|assistant/.test(label)) return 'ai';

  // Hệ thống
  if (path.startsWith('/system') || path.startsWith('/reports') ||
      /người dùng|cài đặt|cronjob|lịch sử|provider|báo cáo/.test(label)) return 'system';

  // Biểu mẫu & Hồ sơ
  if (path.startsWith('/forms') || path.startsWith('/calibration') ||
      path.startsWith('/qaqc/standards') ||
      /biểu mẫu|hồ sơ|hiệu chuẩn|tiêu chuẩn|procedure|form|rfi|sơn|dft|thử áp/.test(label)) return 'records';

  // Mặc định: Quản lý chất lượng (inspection, ncr, mdr, itp, welding, ndt, mir…)
  return 'quality';
}

/** Badge tĩnh demo cho một số item (hiển thị giống mockup). */
function badgeFor(item) {
  const path = (item.to || item.href || '').toLowerCase();
  if (path.startsWith('/ncr')) return { badge: '3' };
  if (path === '/qaqc/projects') return { badge: '8' };
  if (path.includes('/ai')) return { tag: 'new' };
  return {};
}

export function registerMenuConsolidation() {
  // priority lớn ⇒ chạy sau tất cả các module khác
  hooks.addFilter('system.menus', (menus) => {
    // Gom toàn bộ item từ mọi section vào đúng nhóm
    const buckets = new Map(GROUPS.map(g => [g.id, []]));
    const seen = new Set();

    for (const section of menus) {
      const items = section.items || [];
      for (const item of items) {
        const key = item.to || item.href || item.label;
        if (seen.has(key)) continue;      // loại trùng (ví dụ 2 mục "Tổng quan")
        seen.add(key);
        const groupId = classify(item);
        buckets.get(groupId).push({ ...item, ...badgeFor(item) });
      }
    }

    // Dựng lại danh sách section theo đúng thứ tự mockup, bỏ nhóm rỗng
    const consolidated = GROUPS
      .map(g => ({
        id: g.id,
        section: g.section,
        order: g.order,
        items: buckets.get(g.id),
      }))
      .filter(g => g.items.length > 0);

    return consolidated;
  }, 1000);
}
