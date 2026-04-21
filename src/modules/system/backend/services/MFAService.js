import { generateSecret, generate, verify, generateURI, OTP } from 'otplib';
import qrcode from 'qrcode';
import argon2 from 'argon2';
import crypto from 'node:crypto';
import { AppError } from '../../../../core/errors.js';
import { SettingsService } from '../../../../core/settings.js';
import { ProviderService } from './ProviderService.js';
import { mfaRepo } from '../repositories/MFARepository.js';

const hotpOtp = new OTP({ strategy: 'hotp' });

const LOCKOUT_FAILURES = 3;
const LOCKOUT_WINDOW_MIN = 10;
const BACKUP_CODE_COUNT = 10;

function encryptConfig(obj) {
  return SettingsService._encrypt(JSON.stringify(obj));
}

function decryptConfig(text) {
  return JSON.parse(SettingsService._decrypt(text));
}

export class MFAService {
  // ── Query ────────────────────────────────────────────────────────

  static async listFactors(userId) {
    const rows = await mfaRepo.getActiveFactors(userId);
    return rows.map(r => ({
      id: r.id,
      factor_type: r.factor_type,
      factor_name: r.factor_name,
      use_as_login: r.use_as_login,
      enrolled_at: r.enrolled_at,
      last_used_at: r.last_used_at,
    }));
  }

  static async hasActiveFactor(userId) {
    return mfaRepo.hasActiveFactor(userId);
  }

  // ── Lockout ──────────────────────────────────────────────────────

  static async checkLockout(userId) {
    const failures = await mfaRepo.countRecentFailures(userId, LOCKOUT_WINDOW_MIN);
    if (failures >= LOCKOUT_FAILURES) {
      throw new AppError(429, `Nhập sai quá ${LOCKOUT_FAILURES} lần trong ${LOCKOUT_WINDOW_MIN} phút. Thử lại sau.`);
    }
  }

  // ── TOTP ─────────────────────────────────────────────────────────

  static async initTOTP(userId, factorName, appName = 'IBSHI QAQC') {
    const secret = generateSecret();
    const config = encryptConfig({ secret });

    const factor = await mfaRepo.createFactor({
      userId,
      factorType: 'totp',
      factorName,
      config,
    });

    const otpauth = await generateURI({ label: String(userId), issuer: appName, secret });
    const qrCodeDataUrl = await qrcode.toDataURL(otpauth);

    return { factorId: factor.id, qrCodeDataUrl, secret };
  }

  static async enrollTOTP(factorId, userId, token) {
    const factor = await mfaRepo.getFactorById(factorId, userId);
    if (!factor || factor.factor_type !== 'totp' || factor.status !== 'pending') {
      throw new AppError(404, 'Factor không tồn tại hoặc đã được kích hoạt');
    }

    const { secret } = decryptConfig(factor.config);
    const result = await verify({ secret, token });
    if (!result.valid) throw new AppError(400, 'Mã OTP không hợp lệ');

    await mfaRepo.activateFactor(factorId, userId);
  }

  // ── HOTP (Telegram, etc.) ────────────────────────────────────────

  static async initHOTP(userId, factorName, providerName, destination) {
    const secret = generateSecret();
    const config = encryptConfig({ secret, counter: 0, providerName, destination });

    const factor = await mfaRepo.createFactor({
      userId,
      factorType: 'hotp',
      factorName,
      config,
    });

    await MFAService._sendHOTP(factor.id, userId);

    return { factorId: factor.id };
  }

  static async sendHOTP(factorId, userId) {
    const factor = await mfaRepo.getFactorById(factorId, userId);
    if (!factor || factor.factor_type !== 'hotp') {
      throw new AppError(404, 'Factor không tồn tại');
    }
    await MFAService._sendHOTP(factorId, userId);
  }

  static async _sendHOTP(factorId, userId) {
    const factor = await mfaRepo.getFactorById(factorId, userId);
    const cfg = decryptConfig(factor.config);
    const otp = await hotpOtp.generate({ secret: cfg.secret, counter: cfg.counter });

    const provider = await ProviderService.getInstance(cfg.providerName);
    await provider.send(cfg.destination, otp);

    cfg.counter += 1;
    await mfaRepo.updateFactorConfig(factorId, userId, encryptConfig(cfg));
  }

  static async enrollHOTP(factorId, userId, token) {
    const factor = await mfaRepo.getFactorById(factorId, userId);
    if (!factor || factor.factor_type !== 'hotp' || factor.status !== 'pending') {
      throw new AppError(404, 'Factor không tồn tại hoặc đã được kích hoạt');
    }

    const cfg = decryptConfig(factor.config);
    // counter was incremented after send, verify against counter-1
    const usedCounter = cfg.counter - 1;
    const result = await hotpOtp.verify({ token, secret: cfg.secret, counter: usedCounter });
    if (!result.valid) throw new AppError(400, 'Mã OTP không hợp lệ');

    await mfaRepo.activateFactor(factorId, userId);
  }

  // ── Verify (login / sign) ────────────────────────────────────────

  static async verifyFactor(factorId, userId, token, meta = {}) {
    await MFAService.checkLockout(userId);

    const factor = await mfaRepo.getFactorById(factorId, userId);
    if (!factor || factor.status !== 'active') {
      throw new AppError(404, 'Factor không tồn tại');
    }

    let valid = false;

    if (factor.factor_type === 'totp') {
      const { secret } = decryptConfig(factor.config);
      const r = await verify({ secret, token });
      valid = r.valid;

    } else if (factor.factor_type === 'hotp') {
      const cfg = decryptConfig(factor.config);
      const r = await hotpOtp.verify({ token, secret: cfg.secret, counter: cfg.counter - 1 });
      valid = r.valid;
    }

    await mfaRepo.recordAttempt({
      userId,
      factorType: factor.factor_type,
      success: valid,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    if (!valid) throw new AppError(400, 'Mã OTP không hợp lệ');

    await mfaRepo.updateLastUsed(factorId);
    return true;
  }

  // ── Backup codes ─────────────────────────────────────────────────

  static async generateBackupCodes(userId) {
    const codes = Array.from({ length: BACKUP_CODE_COUNT }, () =>
      crypto.randomBytes(5).toString('hex').toUpperCase() // e.g. A1B2C3D4E5
    );

    const hashes = await Promise.all(codes.map(c => argon2.hash(c)));
    await mfaRepo.deleteBackupCodes(userId);
    await mfaRepo.insertBackupCodes(userId, hashes);

    return codes; // plaintext — trả về 1 lần duy nhất
  }

  static async verifyBackupCode(userId, rawCode, meta = {}) {
    await MFAService.checkLockout(userId);

    const rows = await mfaRepo.getUnusedBackupCodes(userId);
    for (const row of rows) {
      const match = await argon2.verify(row.code_hash, rawCode.toUpperCase());
      if (match) {
        await mfaRepo.markBackupCodeUsed(row.id);
        await mfaRepo.recordAttempt({ userId, factorType: 'backup_code', success: true, ...meta });
        return true;
      }
    }

    await mfaRepo.recordAttempt({ userId, factorType: 'backup_code', success: false, ...meta });
    throw new AppError(400, 'Backup code không hợp lệ hoặc đã sử dụng');
  }

  // ── Admin ────────────────────────────────────────────────────────

  static async disableFactor(factorId, userId) {
    const ok = await mfaRepo.disableFactor(factorId, userId);
    if (!ok) throw new AppError(404, 'Factor không tồn tại');
  }

  static async resetAllFactors(userId) {
    await mfaRepo.disableAllFactors(userId);
    await mfaRepo.deleteBackupCodes(userId);
  }

  static async cancelPendingFactor(factorId, userId) {
    await mfaRepo.deletePendingFactor(factorId, userId);
  }

  // ── Available HOTP providers ─────────────────────────────────────

  static async listHOTPProviders() {
    const { pool } = await import('../../../../core/db.js');
    const { rows } = await pool.query(
      `SELECT name, description FROM sys_providers WHERE module = 'mfa' AND is_active = true ORDER BY name`
    );
    return rows;
  }
}
