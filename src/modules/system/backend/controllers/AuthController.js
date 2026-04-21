import { AppError } from '../../../../core/errors.js';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { usersRepo } from '../repositories/UsersRepository.js';
import { mfaRepo } from '../repositories/MFARepository.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('FATAL: JWT_SECRET environment variable is required');

export class AuthController {

  static async login(req, res) {
    const { username, password } = req.body;
    if (!username || !password) {
      throw new AppError(400, 'Tài khoản và mật khẩu là bắt buộc');
    }

    const user = await usersRepo.findByUsername(username);
    if (!user) {
      throw new AppError(401, 'Tài khoản hoặc mật khẩu không chính xác');
    }
    if (!user.is_active) {
      throw new AppError(403, 'Tài khoản của bạn đã bị vô hiệu hóa.');
    }
    if (user.failed_login_count >= 10) {
      throw new AppError(423, 'Tài khoản tạm khóa do nhập sai quá nhiều lần. Vui lòng liên hệ Admin.');
    }

    const valid = await argon2.verify(user.password_hash, password);
    if (!valid) {
      await usersRepo.incrementFailedLogin(user.id);
      throw new AppError(401, 'Tài khoản hoặc mật khẩu không chính xác');
    }

    await usersRepo.recordSuccessfulLogin(user.id);

    const activeFactors = await mfaRepo.getActiveFactors(user.id);
    if (activeFactors.length > 0) {
      const partialToken = jwt.sign(
        { id: user.id, username: user.username, is_admin: user.is_admin, full_name: user.full_name, step: 'mfa' },
        JWT_SECRET,
        { expiresIn: '5m' }
      );
      return res.json({
        mfa_required: true,
        partial_token: partialToken,
        available_factors: activeFactors.map(f => ({
          id: f.id,
          factor_type: f.factor_type,
          factor_name: f.factor_name,
        })),
      });
    }

    const token = jwt.sign({
      id: user.id,
      username: user.username,
      is_admin: user.is_admin,
      full_name: user.full_name,
      mfa_verified: false,
    }, JWT_SECRET, { expiresIn: '8h' });

    res.json({
      token,
      user: { id: user.id, username: user.username, full_name: user.full_name, is_admin: user.is_admin },
    });
  }

  static async getProfile(req, res) {
    const userId = req.user.id;
    const user = await usersRepo.findByIdSafe(userId);
    if (!user) throw new AppError(404, 'User not found');

    const actions = user.is_admin ? [] : await usersRepo.getUserActions(userId);
    res.json({ user, actions });
  }

  static async updateProfile(req, res) {
    const userId = req.user.id;
    const { full_name, current_password, new_password } = req.body;

    const data = {};
    if (full_name) data.full_name = full_name;

    if (new_password) {
      if (!current_password) {
        throw new AppError(400, 'Yêu cầu mật khẩu hiện tại để đổi mật khẩu mới');
      }
      const existing = await usersRepo.findOne(userId);
      const valid = await argon2.verify(existing.password_hash, current_password);
      if (!valid) {
        throw new AppError(400, 'Mật khẩu hiện tại không chính xác');
      }
      data.password_hash = await argon2.hash(new_password);
    }

    if (Object.keys(data).length === 0) {
      const user = await usersRepo.findByIdSafe(userId);
      return res.json({ success: true, user });
    }

    const updated = await usersRepo.update(userId, data);
    res.json({ success: true, user: usersRepo.sanitize(updated) });
  }
}
