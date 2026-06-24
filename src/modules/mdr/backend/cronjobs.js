import { hooks } from '../../../core/hooks.js';

export function registerMDRCronjobs() {
  hooks.addFilter('system.cronjobs', (jobs) => {
    jobs.push({
      name:        'mdr.completeness.daily-scan',
      description: 'Quét độ hoàn thiện toàn bộ hồ sơ MDR & cảnh báo hồ sơ chưa đủ trước bàn giao',
      cron:        '0 6 * * *',
      fn:          async () => {
        const { pool } = await import('../../../core/db.js');
        const { MDRService } = await import('./services/MDRService.js');
        const { rows } = await pool.query(
          `SELECT id FROM mdr_dossiers WHERE status NOT IN ('submitted')`
        );
        let scanned = 0, alerted = 0;
        for (const d of rows) {
          const r = await MDRService.scanCompleteness(d.id);
          scanned++;
          if (r.completion_pct < 100) {
            await MDRService.alertNearDelivery(d.id);
            alerted++;
          }
        }
        return { scanned, alerted };
      },
    });
    return jobs;
  });
}
