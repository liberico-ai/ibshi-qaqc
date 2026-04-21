import jwt from 'jsonwebtoken';
import { AppError } from '../../../../core/errors.js';
import { MFAService } from '../services/MFAService.js';
import { PasskeyService } from '../services/PasskeyService.js';
import { usersRepo } from '../repositories/UsersRepository.js';

const JWT_SECRET = process.env.JWT_SECRET;

function makeFullToken(user, mfaVerified) {
  return jwt.sign(
    { id: user.id, username: user.username, is_admin: user.is_admin, full_name: user.full_name, mfa_verified: mfaVerified },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
}

function verifyPartialToken(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) throw new AppError(401, 'Cần partial token');
  try {
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    if (decoded.step !== 'mfa') throw new AppError(401, 'Token không hợp lệ');
    return decoded;
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(401, 'Token không hợp lệ hoặc đã hết hạn');
  }
}

export class MFAController {
  // ── Factor list ──────────────────────────────────────────────────

  static async listFactors(req, res) {
    const factors = await MFAService.listFactors(req.user.id);
    res.json({ factors });
  }

  // ── TOTP ─────────────────────────────────────────────────────────

  static async initTOTP(req, res) {
    const { factor_name } = req.body;
    const result = await MFAService.initTOTP(req.user.id, factor_name);
    res.json(result);
  }

  static async enrollTOTP(req, res) {
    const { token } = req.body;
    await MFAService.enrollTOTP(req.params.id, req.user.id, token);
    res.json({ success: true });
  }

  // ── HOTP ─────────────────────────────────────────────────────────

  static async listHOTPProviders(req, res) {
    const providers = await MFAService.listHOTPProviders();
    res.json({ providers });
  }

  static async initHOTP(req, res) {
    const { factor_name, provider_name, destination } = req.body;
    const result = await MFAService.initHOTP(req.user.id, factor_name, provider_name, destination);
    res.json(result);
  }

  static async sendHOTP(req, res) {
    await MFAService.sendHOTP(req.params.id, req.user.id);
    res.json({ success: true });
  }

  static async enrollHOTP(req, res) {
    const { token } = req.body;
    await MFAService.enrollHOTP(req.params.id, req.user.id, token);
    res.json({ success: true });
  }

  // ── Disable / cancel ─────────────────────────────────────────────

  static async disableFactor(req, res) {
    await MFAService.disableFactor(req.params.id, req.user.id);
    res.json({ success: true });
  }

  static async cancelFactor(req, res) {
    await MFAService.cancelPendingFactor(req.params.id, req.user.id);
    res.json({ success: true });
  }

  // ── Backup codes ─────────────────────────────────────────────────

  static async generateBackupCodes(req, res) {
    const codes = await MFAService.generateBackupCodes(req.user.id);
    res.json({ codes });
  }

  // ── Login flow: verify MFA ────────────────────────────────────────

  static async verifyMFA(req, res) {
    const { factor_id, token } = req.body;
    const partial = verifyPartialToken(req);
    const meta = { ip: req.ip, userAgent: req.headers['user-agent'] };

    await MFAService.verifyFactor(factor_id, partial.id, token, meta);

    const fullToken = makeFullToken(
      { id: partial.id, username: partial.username, is_admin: partial.is_admin, full_name: partial.full_name },
      true
    );
    res.json({ token: fullToken });
  }

  static async verifyBackupCode(req, res) {
    const { backup_code } = req.body;
    const partial = verifyPartialToken(req);
    const meta = { ip: req.ip, userAgent: req.headers['user-agent'] };

    await MFAService.verifyBackupCode(partial.id, backup_code, meta);

    const fullToken = makeFullToken(
      { id: partial.id, username: partial.username, is_admin: partial.is_admin, full_name: partial.full_name },
      true
    );
    res.json({ token: fullToken });
  }

  // ── Passkey enrollment ───────────────────────────────────────────

  static async passkeyRegistrationOptions(req, res) {
    const user = req.user;
    const options = await PasskeyService.registrationOptions(user.id, user.username);
    res.json(options);
  }

  static async passkeyVerifyRegistration(req, res) {
    const { factor_name, response } = req.body;
    const result = await PasskeyService.verifyRegistration(
      req.user.id,
      factor_name || 'Passkey',
      response
    );
    res.json(result);
  }

  // ── Passkey login ────────────────────────────────────────────────

  static async passkeyAuthChallenge(req, res) {
    const { options, challengeKey } = await PasskeyService.authenticationOptions();
    res.json({ options, challenge_key: challengeKey });
  }

  static async passkeyVerifyLogin(req, res) {
    const { response, challenge_key } = req.body;
    const { userId } = await PasskeyService.verifyAuthentication(response, challenge_key);

    const user = await usersRepo.findByIdSafe(userId);
    if (!user) throw new AppError(401, 'Người dùng không tồn tại');
    if (!user.is_active) throw new AppError(403, 'Tài khoản đã bị vô hiệu hóa');

    const token = jwt.sign(
      { id: user.id, username: user.username, is_admin: user.is_admin, full_name: user.full_name, mfa_verified: true },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ token, user: { id: user.id, username: user.username, full_name: user.full_name, is_admin: user.is_admin } });
  }

  // ── Admin ────────────────────────────────────────────────────────

  static async adminResetMFA(req, res) {
    const targetUserId = Number(req.params.userId);
    await MFAService.resetAllFactors(targetUserId);
    res.json({ success: true });
  }
}
