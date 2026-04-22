import { hooks } from '../../../core/hooks.js';

export function registerQAQCCronjobs() {
  hooks.addFilter('system.cronjobs', (jobs) => {
    jobs.push({
      name:        'qaqc.projects.nightly-sync',
      description: 'Đồng bộ danh sách dự án từ ibshi ERP',
      cron:        '0 2 * * *',
      fn:          async () => {
        const { ProjectSyncService } = await import('./services/ProjectSyncService.js');
        return ProjectSyncService.sync();
      },
    });

    jobs.push({
      name:        'qaqc.hold-point.weekly-override-report',
      description: 'Báo cáo tuần: Hold Point overrides trong 7 ngày qua',
      cron:        '0 7 * * 1',
      fn:          async () => {
        const { pool } = await import('../../../core/db.js');
        const { NotificationService } = await import('../../system/backend/services/NotificationService.js');

        const { rows } = await pool.query(
          `SELECT o.*, u.full_name AS performed_by_name, i.ip_code
           FROM sys_overrides o
           JOIN sys_users u ON u.id = o.performed_by
           LEFT JOIN qaqc_itp_items i ON i.id = o.entity_id
           WHERE o.override_type = 'HOLD_POINT'
             AND o.performed_at >= now() - interval '7 days'
           ORDER BY o.performed_at DESC`
        );

        if (!rows.length) {
          await NotificationService.sendNotification({
            targetType: 'role',
            targetId:   'QC-DIR',
            title:      'Báo cáo Hold Point Override (tuần)',
            message:    'Không có Hold Point Override nào trong 7 ngày qua.',
            type:       'info',
          });
        } else {
          const summary = rows.map(r =>
            `• ${r.ip_code ?? r.entity_id}: ${r.performed_by_name} — ${new Date(r.performed_at).toLocaleDateString('vi-VN')}`
          ).join('\n');
          await NotificationService.sendNotification({
            targetType: 'role',
            targetId:   'QC-DIR',
            title:      `Báo cáo Hold Point Override: ${rows.length} override trong 7 ngày`,
            message:    summary,
            type:       'warning',
          });
        }

        return { overrideCount: rows.length };
      },
    });

    return jobs;
  });
}
