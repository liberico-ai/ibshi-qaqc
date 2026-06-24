import { hooks } from '../../../core/hooks.js';

const WARN_DAYS = 60;

export function registerWeldingCronjobs() {
  hooks.addFilter('system.cronjobs', (jobs) => {
    jobs.push({
      name:        'welding.welder-cert.expiry-warning',
      description: `Cảnh báo chứng chỉ thợ hàn sắp hết hạn (trước ${WARN_DAYS} ngày)`,
      cron:        '0 6 * * *',
      fn:          async () => {
        const { welderRepo } = await import('./repositories/WeldingRepository.js');
        const expiring = await welderRepo.findExpiringQuals(WARN_DAYS);

        if (!expiring.length) return { expiringCount: 0 };

        const summary = expiring.map(q =>
          `• ${q.welder_code} (${q.full_name}) — ${q.process ?? ''} ${q.position ?? ''}: hết hạn ${new Date(q.expiry_date).toLocaleDateString('vi-VN')}`
        ).join('\n');

        const title = `Cảnh báo: ${expiring.length} chứng chỉ thợ hàn sắp hết hạn`;

        // Gửi cảnh báo tới vai trò QC qua NotificationService (theo mẫu cronjob qaqc)
        try {
          const { NotificationService } = await import('../../system/backend/services/NotificationService.js');
          await NotificationService.sendNotification({
            targetType: 'role',
            targetId:   'QC-DIR',
            title,
            message:    summary,
            type:       'WARNING',
            link:       '/welding/welders',
          });
        } catch { /* NotificationService không khả dụng — bỏ qua */ }

        // Đồng thời phát qua notification hook (channel-agnostic dispatcher)
        await hooks.doAction('qaqc.notification.event', {
          eventType: 'WELDER_CERT_EXPIRING',
          payload: { title, message: summary, link: '/welding/welders' },
          userIds: [],
        });

        return { expiringCount: expiring.length };
      },
    });

    return jobs;
  });
}
