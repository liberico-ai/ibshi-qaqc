import { hooks } from '../../../core/hooks.js';

const ALERT_THRESHOLDS = [30, 7, 1]; // ngày trước khi hết hạn

export function registerCalibrationCronjobs() {
  hooks.addFilter('system.cronjobs', (jobs) => {
    jobs.push({
      name:        'calibration.expiry-alerts',
      description: 'Cảnh báo thiết bị sắp tới hạn hiệu chuẩn (30/7/1 ngày)',
      cron:        '0 6 * * *', // mỗi ngày 06:00
      fn:          async () => {
        const { pool } = await import('../../../core/db.js');
        const { NotificationService } = await import('../../system/backend/services/NotificationService.js');

        // Lần hiệu chuẩn mới nhất của mỗi thiết bị, kèm số ngày còn lại tới due_date
        const { rows } = await pool.query(`
          SELECT r.id AS record_id, r.due_date, r.alert_sent_at,
                 d.device_code, d.name AS device_name,
                 (r.due_date - CURRENT_DATE) AS days_left
          FROM cal_records r
          JOIN cal_devices d ON d.id = r.device_id
          WHERE d.status = 'ACTIVE'
            AND r.due_date IS NOT NULL
            AND r.due_date >= CURRENT_DATE
            AND r.id = (
              SELECT cr.id FROM cal_records cr
              WHERE cr.device_id = d.id
              ORDER BY cr.due_date DESC NULLS LAST, cr.created_at DESC LIMIT 1
            )
        `);

        // Người nhận: user có quyền calibration.write + admin
        const { rows: recipients } = await pool.query(`
          SELECT DISTINCT u.id FROM sys_users u
          WHERE u.is_active = true AND (
            u.is_admin = true OR u.id IN (
              SELECT ur.user_id FROM sys_user_roles ur
              JOIN sys_role_actions ra ON ra.role_id = ur.role_id
              WHERE ra.action_name = 'calibration.write'
            )
          )
        `);

        let alertCount = 0;
        for (const r of rows) {
          const sent = Array.isArray(r.alert_sent_at) ? r.alert_sent_at : [];
          const due = ALERT_THRESHOLDS.find(t => Number(r.days_left) <= t && !sent.includes(t));
          if (due === undefined) continue;

          const dueStr = new Date(r.due_date).toLocaleDateString('vi-VN');
          for (const u of recipients) {
            await NotificationService.sendNotification({
              targetId: u.id,
              title:    `Thiết bị sắp hết hạn hiệu chuẩn (${r.days_left} ngày)`,
              message:  `Thiết bị ${r.device_code} — ${r.device_name} sẽ hết hạn hiệu chuẩn vào ${dueStr}.`,
              type:     Number(r.days_left) <= 1 ? 'ERROR' : 'WARNING',
              link:     '/calibration/devices',
            });
          }

          await pool.query(
            'UPDATE cal_records SET alert_sent_at = $1, updated_at = now() WHERE id = $2',
            [JSON.stringify([...sent, due]), r.record_id]
          );
          alertCount++;
        }

        return { devicesChecked: rows.length, alertsSent: alertCount, recipients: recipients.length };
      },
    });

    return jobs;
  });
}
