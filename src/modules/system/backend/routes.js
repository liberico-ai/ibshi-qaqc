import { UsersController } from './controllers/UsersController.js';
import { RolesController } from './controllers/RolesController.js';
import { ActionsController } from './controllers/ActionsController.js';
import { AuthController } from './controllers/AuthController.js';
import { MFAController } from './controllers/MFAController.js';
import { MenusController } from './controllers/MenusController.js';
import { CronjobController } from './controllers/CronjobController.js';
import { NotificationsController } from './controllers/NotificationsController.js';
import { SettingsController } from './controllers/SettingsController.js';
import { SystemInfoController } from './controllers/SystemInfoController.js';
import { SysLogsController } from './controllers/SysLogsController.js';
import { ProvidersController } from './controllers/ProvidersController.js';
import { SignatureController } from './controllers/SignatureController.js';
import { NotificationPrefsController } from './controllers/NotificationPrefsController.js';
import { UserPreferencesController } from './controllers/UserPreferencesController.js';
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

  // Cronjobs
  app.get('/api/system/cronjobs', requireAction('settings.read'), asyncHandler(CronjobController.getCronjobs));
  app.get('/api/system/cronjobs/:jobName/logs', requireAction('settings.read'), asyncHandler(CronjobController.getJobHistory));
  app.post('/api/system/cronjobs/:jobName/run', requireAction('settings.write'), asyncHandler(CronjobController.manuallyRunJob));

  // Sys Logs
  app.get('/api/system/logs',        requireAction('logs.read'), asyncHandler(SysLogsController.getLogs));
  app.get('/api/system/logs/stats',  requireAction('logs.read'), asyncHandler(SysLogsController.getStats));
  app.get('/api/system/logs/:id',    requireAction('logs.read'), asyncHandler(SysLogsController.getLogDetail));

  // MFA — factor management (authenticated user)
  app.get(   '/api/system/mfa/factors',                requireAction(null), asyncHandler(MFAController.listFactors));
  app.get(   '/api/system/mfa/providers',              requireAction(null), asyncHandler(MFAController.listHOTPProviders));
  app.get(   '/api/system/mfa/backup-codes',           requireAction(null), asyncHandler(MFAController.generateBackupCodes));
  app.post(  '/api/system/mfa/factors/totp/init',      requireAction(null),
    validate({ factor_name: [required, isString] }),
    asyncHandler(MFAController.initTOTP));
  app.post(  '/api/system/mfa/factors/totp/:id/enroll', requireAction(null),
    validate({ token: [required, isString] }),
    asyncHandler(MFAController.enrollTOTP));
  app.post(  '/api/system/mfa/factors/hotp/init',      requireAction(null),
    validate({ factor_name: [required, isString], provider_name: [required, isString], destination: [required, isString] }),
    asyncHandler(MFAController.initHOTP));
  app.post(  '/api/system/mfa/factors/hotp/:id/send',  requireAction(null), asyncHandler(MFAController.sendHOTP));
  app.post(  '/api/system/mfa/factors/hotp/:id/enroll', requireAction(null),
    validate({ token: [required, isString] }),
    asyncHandler(MFAController.enrollHOTP));
  app.delete('/api/system/mfa/factors/:id',            requireAction(null), asyncHandler(MFAController.disableFactor));
  app.delete('/api/system/mfa/factors/:id/pending',    requireAction(null), asyncHandler(MFAController.cancelFactor));

  // Passkey — enrollment (authenticated)
  app.get( '/api/system/mfa/passkey/options', requireAction(null), asyncHandler(MFAController.passkeyRegistrationOptions));
  app.post('/api/system/mfa/passkey/enroll',  requireAction(null),
    validate({ response: [required] }),
    asyncHandler(MFAController.passkeyVerifyRegistration));

  // Passkey — login (unauthenticated)
  app.get( '/api/auth/passkey/challenge', asyncHandler(MFAController.passkeyAuthChallenge));
  app.post('/api/auth/passkey/verify',
    validate({ response: [required], challenge_key: [required, isString] }),
    asyncHandler(MFAController.passkeyVerifyLogin));

  // MFA — login verify (partial token, no requireAction)
  app.post('/api/auth/mfa/verify',
    validate({ factor_id: [required, isString], token: [required, isString] }),
    asyncHandler(MFAController.verifyMFA));
  app.post('/api/auth/mfa/backup',
    validate({ backup_code: [required, isString] }),
    asyncHandler(MFAController.verifyBackupCode));

  // MFA — admin reset
  app.post('/api/system/mfa/admin/:userId/reset', requireAction('users.write'), asyncHandler(MFAController.adminResetMFA));

  // Digital Signature
  app.post('/api/system/signature/enroll-pin',
    requireAction(null),
    validate({ pin: [required, isString] }),
    asyncHandler(SignatureController.enrollPIN)
  );
  app.post('/api/system/signature/sign',
    requireAction(null),
    validate({ pin: [required, isString], otp_token: [required, isString], entity_type: [required, isString], entity_id: [required, isString] }),
    asyncHandler(SignatureController.sign)
  );
  app.get('/api/system/signature/:entityType/:entityId', requireAction(null), asyncHandler(SignatureController.getSignature));
  app.post('/api/system/signature/:id/void',
    requireAction(null),
    validate({ reason: [required, isString] }),
    asyncHandler(SignatureController.voidSignature)
  );

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
