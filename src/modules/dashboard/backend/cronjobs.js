import { hooks } from '../../../core/hooks.js';

export function registerDashboardCronjobs() {
  hooks.addFilter('system.cronjobs', (jobs) => {
    // Báo cáo KPI tuần — gửi thông báo cho người có quyền dashboard.mgmt.read
    jobs.push({
      name:        'dashboard.weekly-kpi-report',
      description: 'Tạo & thông báo báo cáo KPI tuần',
      cron:        '0 7 * * 1', // Thứ 2 hàng tuần 07:00
      fn:          async () => sendReport('weekly'),
    });

    // Báo cáo KPI tháng
    jobs.push({
      name:        'dashboard.monthly-kpi-report',
      description: 'Tạo & thông báo báo cáo KPI tháng',
      cron:        '0 7 1 * *', // Ngày 1 hàng tháng 07:00
      fn:          async () => sendReport('monthly'),
    });

    return jobs;
  });
}

async function sendReport(period) {
  const { pool } = await import('../../../core/db.js');
  const { NotificationService } = await import('../../system/backend/services/NotificationService.js');
  const { ReportService } = await import('./services/ReportService.js');

  // Sinh PDF (đồng thời ghi dashboard_report_runs)
  await ReportService.generateKpiPdf({ period });

  const { rows: recipients } = await pool.query(`
    SELECT DISTINCT u.id FROM sys_users u
    WHERE u.is_active = true AND (
      u.is_admin = true OR u.id IN (
        SELECT ur.user_id FROM sys_user_roles ur
        JOIN sys_role_actions ra ON ra.role_id = ur.role_id
        WHERE ra.action_name IN ('dashboard.mgmt.read', 'dashboard.qc.read')
      )
    )
  `);

  const label = period === 'monthly' ? 'tháng' : 'tuần';
  for (const u of recipients) {
    await NotificationService.sendNotification({
      targetId: u.id,
      title:    `Báo cáo KPI ${label} đã sẵn sàng`,
      message:  `Báo cáo KPI ${label} vừa được tạo. Truy cập Tổng quan Quản lý để tải PDF.`,
      type:     'INFO',
      link:     '/dashboard/management',
    });
  }

  return { period, recipients: recipients.length };
}
