import { registerSystemActions } from './actions.js';
import { registerSystemRoutes } from './routes.js';
import { registerSystemMenus } from './menus.js';
import { registerMenuConsolidation } from './menuConsolidation.js';
import { registerSystemCronjobs } from './cronjobs.js';
import { SettingsService } from '../../../core/settings.js';
import { auditLog } from '../../../core/audit-log.js';
import { providerRegistry } from '../../../core/provider-registry.js';

import { channelRegistry } from './services/ChannelRegistry.js';
import { TelegramChannelProvider } from './providers/TelegramChannelProvider.js';
import { MattermostChannelProvider } from './providers/MattermostChannelProvider.js';
import { EmailChannelProvider } from './providers/EmailChannelProvider.js';
import { providersRepo } from './repositories/ProvidersRepository.js';
import { notificationChannelRepo } from './repositories/NotificationChannelRepository.js';
import { createLogger } from '../../../core/logger.js';

const log = createLogger('system-module');

async function loadChannelConfig(className) {
  try {
    const rows = await providersRepo.findByClassName(className);
    if (!rows[0]) return null;
    const record = rows[0];
    let cfg = {};
    if (record.config) {
      try {
        cfg = JSON.parse(SettingsService._decrypt(record.config));
      } catch { /* ignore */ }
    }
    return cfg;
  } catch (err) {
    log.warn({ err: err.message, className }, 'Failed to load channel config');
    return null;
  }
}

export default async function registerSystemModule(app) {
  registerSystemActions();

  providerRegistry.register('notification-telegram',   TelegramChannelProvider,   'system', 'Telegram notification channel');
  providerRegistry.register('notification-mattermost', MattermostChannelProvider, 'system', 'Mattermost notification channel');
  providerRegistry.register('notification-email',      EmailChannelProvider,      'system', 'Email notification channel (stub)');

  registerSystemMenus();
  registerMenuConsolidation();   // hợp nhất menu 5 nhóm theo mockup (chạy sau cùng)
  registerSystemRoutes(app);
  registerSystemCronjobs();

  try {
    const { data } = await SettingsService.getAllSettings();
    auditLog.syncFromSettings(data);
  } catch {
    // DB chưa sẵn sàng
  }

  try {
    const telegramCfg = await loadChannelConfig('notification-telegram');
    if (telegramCfg) {
      await channelRegistry.register('notification-telegram', TelegramChannelProvider, telegramCfg,
        async (chatId, code) => notificationChannelRepo.completeLinkByCode('notification-telegram', code, chatId));
    }
    const mattermostCfg = await loadChannelConfig('notification-mattermost');
    if (mattermostCfg) {
      await channelRegistry.register('notification-mattermost', MattermostChannelProvider, mattermostCfg);
    }
    const emailCfg = await loadChannelConfig('notification-email');
    if (emailCfg) {
      await channelRegistry.register('notification-email', EmailChannelProvider, emailCfg);
    }
  } catch (err) {
    log.warn({ err: err.message }, 'Channel registration skipped — DB not ready or no active channels');
  }
}
