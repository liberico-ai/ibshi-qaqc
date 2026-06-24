import { UsersController } from './controllers/UsersController.js';
import { RolesController } from './controllers/RolesController.js';
import { ActionsController } from './controllers/ActionsController.js';
import { AuthController } from './controllers/AuthController.js';
import { MenusController } from './controllers/MenusController.js';
import { CronjobController } from './controllers/CronjobController.js';
import { NotificationsController } from './controllers/NotificationsController.js';
import { SettingsController } from './controllers/SettingsController.js';
import { SystemInfoController } from './controllers/SystemInfoController.js';
import { SysLogsController } from './controllers/SysLogsController.js';
import { ProvidersController } from './controllers/ProvidersController.js';
import { NotificationPrefsController } from './controllers/NotificationPrefsController.js';
import { UserPreferencesController } from './controllers/UserPreferencesController.js';
import { SignatureController } from './controllers/SignatureController.js';
import { requireAction } from '../../../core/permission.js';
import { asyncHandler } from '../../../core/errors.js';
import { validate, required, isString, isArray, minLength } from '../../../core/validate.js';
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 10, 
  message: { error: 'Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau 15 phút.' },
  standardHeaders: true,
});

export function registerSystemRoutes(app) {
  // Auth & Profile
  app.post('/api/system/login',
    loginLimiter,
    validate({ username: [required, isString], password: [required, isString] }),
    asyncHandler(AuthController.login)
  );
  app.get('/api/system/profile',  requireAction(null), asyncHandler(AuthController.getProfile));
  app.put('/api/system/profile',  requireAction(null), asyncHandler(AuthController.updateProfile));
  app.get('/api/system/users/me/preferences', requireAction(null), asyncHandler(UserPreferencesController.getMyPreferences));
  app.put('/api/system/users/me/preferences', requireAction(null), asyncHandler(UserPreferencesController.updateMyPreferences));
  app.get('/api/system/menus',    requireAction(null), asyncHandler(MenusController.getMenus));

  // Notifications
  app.get('/api/system/notifications', requireAction(null), asyncHandler(NotificationsController.getMyNotifications));
  app.get('/api/system/notifications/unread-count', requireAction(null), asyncHandler(NotificationsController.getUnreadCount));
  app.put('/api/system/notifications/read-all', requireAction(null), asyncHandler(NotificationsController.markAllAsRead));
  app.put('/api/system/notifications/:id/read', requireAction(null), asyncHandler(NotificationsController.markAsRead));

  // Users
  app.get(   '/api/system/users',     requireAction('users.read'),  asyncHandler(UsersController.getAll));
  app.post(  '/api/system/users',     requireAction('users.write'),
    validate({ username: [required, isString, minLength(3)], password: [required, isString, minLength(6)] }),
    asyncHandler(UsersController.create)
  );
  app.put(   '/api/system/users/:id', requireAction('users.write'), asyncHandler(UsersController.update));
  app.delete('/api/system/users/:id', requireAction('users.write'), asyncHandler(UsersController.delete));

  // Roles
  app.get(   '/api/system/roles',             requireAction('roles.read'),  asyncHandler(RolesController.getAll));
  app.post(  '/api/system/roles',             requireAction('roles.write'),
    validate({ name: [required, isString] }),
    asyncHandler(RolesController.create)
  );
  app.put(   '/api/system/roles/:id',         requireAction('roles.write'), asyncHandler(RolesController.update));
  app.put(   '/api/system/roles/:id/actions', requireAction('roles.write'), asyncHandler(RolesController.syncActions));
  app.delete('/api/system/roles/:id',         requireAction('roles.write'), asyncHandler(RolesController.delete));

  // Actions meta
  app.get('/api/system/actions', requireAction('roles.read'), ActionsController.getGrouped);

  // Settings
  // Cài đặt đọc public để phục vụ màn Login, ghi thì yêu cầu quyền quản lý
  app.get('/api/system/settings', asyncHandler(SettingsController.getSettings));
  app.put('/api/system/settings', requireAction('settings.manage'), asyncHandler(SettingsController.updateSettings));

  // System Info
  app.get('/api/system/info', asyncHandler(SystemInfoController.getInfo));

  // Digital signature (Gap-03) — PIN ký số & lịch sử chữ ký
  app.get( '/api/system/signature/status',  requireAction(null), asyncHandler(SignatureController.status));
  app.post('/api/system/signature/set-pin', requireAction(null),
    validate({ pin: [required, isString] }),
    asyncHandler(SignatureController.setPin)
  );
  app.post('/api/system/signature/verify',  requireAction(null),
    validate({ pin: [required, isString] }),
    asyncHandler(SignatureController.verify)
  );
  app.get( '/api/system/signature/:entityType/:entityId', requireAction(null), asyncHandler(SignatureController.listForEntity));

  // Cronjobs
  app.get('/api/system/cronjobs', requireAction('settings.read'), asyncHandler(CronjobController.getCronjobs));
  app.get('/api/system/cronjobs/:jobName/logs', requireAction('settings.read'), asyncHandler(CronjobController.getJobHistory));
  app.post('/api/system/cronjobs/:jobName/run', requireAction('settings.write'), asyncHandler(CronjobController.manuallyRunJob));

  // Sys Logs
  app.get('/api/system/logs',        requireAction('logs.read'), asyncHandler(SysLogsController.getLogs));
  app.get('/api/system/logs/stats',  requireAction('logs.read'), asyncHandler(SysLogsController.getStats));
  app.get('/api/system/logs/:id',    requireAction('logs.read'), asyncHandler(SysLogsController.getLogDetail));

  // Notification Preferences & Channels
  app.get(   '/api/system/notifications/prefs',                                 requireAction(null), asyncHandler(NotificationPrefsController.getPrefs));
  app.put(   '/api/system/notifications/prefs',                                 requireAction(null), asyncHandler(NotificationPrefsController.updatePrefs));
  app.post(  '/api/system/notifications/channels/:channelClass/link/initiate', requireAction(null), asyncHandler(NotificationPrefsController.initiateLink));
  app.post(  '/api/system/notifications/channels/:channelClass/link/complete', requireAction(null), asyncHandler(NotificationPrefsController.completeLink));
  app.delete('/api/system/notifications/channels/:channelClass',               requireAction(null), asyncHandler(NotificationPrefsController.unlinkChannel));

  // Outbound Webhooks (admin)
  app.get(   '/api/system/webhooks',      requireAction('system.providers.read'),  asyncHandler(NotificationPrefsController.listWebhooks));
  app.post(  '/api/system/webhooks',      requireAction('system.providers.write'), asyncHandler(NotificationPrefsController.createWebhook));
  app.delete('/api/system/webhooks/:id',  requireAction('system.providers.write'), asyncHandler(NotificationPrefsController.deleteWebhook));

  // Providers
  app.get(   '/api/system/providers',          requireAction('system.providers.read'),  asyncHandler(ProvidersController.getAll));
  app.get(   '/api/system/providers/classes',  requireAction('system.providers.read'),  asyncHandler(ProvidersController.getClasses));
  app.get(   '/api/system/providers/:id',      requireAction('system.providers.read'),  asyncHandler(ProvidersController.getOne));
  app.post(  '/api/system/providers',          requireAction('system.providers.write'), asyncHandler(ProvidersController.create));
  app.put(   '/api/system/providers/:id',      requireAction('system.providers.write'), asyncHandler(ProvidersController.update));
  app.post(  '/api/system/providers/:id/test', requireAction('system.providers.write'), asyncHandler(ProvidersController.test));
  app.delete('/api/system/providers/:id',      requireAction('system.providers.write'), asyncHandler(ProvidersController.softDelete));
}
