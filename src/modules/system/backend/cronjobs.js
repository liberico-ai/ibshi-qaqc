import { hooks } from '../../../core/hooks.js';
import { executeJob } from '../../../core/scheduler.js';
import { auditLog } from '../../../core/audit-log.js';

async function runPurgeAuditLogs() {
  return await executeJob('purge_audit_logs', async () => {
    const deleted = await auditLog.purgeOldLogs();
    return { deleted };
  });
}

export function registerSystemCronjobs() {
  hooks.addFilter('system.cronjobs', (schedules) => {
    schedules.push({
      name: 'purge_audit_logs',
      cron: '0 3 * * *', // 3:00 AM mỗi ngày
      description: 'Dọn dẹp log thao tác cũ theo thời gian lưu trữ đã cài đặt',
      fn: runPurgeAuditLogs,
    });
    return schedules;
  });
}
