import { hooks } from '../../../core/hooks.js';

export function registerNCRCronjobs() {
  hooks.addFilter('system.cronjobs', (jobs) => {
    jobs.push({
      name:        'ncr.deadline.escalation',
      description: 'Quét NCR quá hạn / sắp tới hạn (2 ngày) và gửi cảnh báo escalation',
      cron:        '0 7 * * *',
      fn:          async () => {
        const { NCRWorkflowService } = await import('./services/NCRWorkflowService.js');
        return NCRWorkflowService.runEscalation();
      },
    });
    return jobs;
  });
}
