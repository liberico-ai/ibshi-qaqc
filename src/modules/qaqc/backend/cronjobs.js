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
    return jobs;
  });
}
