import crypto from 'crypto';
import argon2 from 'argon2';
import { pool } from '../../../../core/db.js';
import { AppError } from '../../../../core/errors.js';

/**
 * SignatureService — Gap-03 chữ ký số có giá trị chống chối bỏ (non-repudiation).
 *
 * Cơ chế:
 *  - Mỗi người dùng đặt một PIN ký số (lưu băm argon2 trong sys_user_pins).
 *  - Khi ký, hệ thống xác thực PIN, băm payload (SHA-256) làm bằng chứng nội
 *    dung tại thời điểm ký, rồi ghi một dòng BẤT BIẾN vào sys_signatures
 *    (append-only — không UPDATE/DELETE).
 *
 * OTP là tuỳ chọn (chưa bắt buộc); PIN là bắt buộc.
 */
export class SignatureService {
  /** Đặt/đổi PIN ký số (đặt một lần, có thể đổi). PIN tối thiểu 4 ký tự số. */
  static async setPin(userId, pin) {
    if (!userId) throw new AppError(401, 'Chưa xác thực người dùng');
    if (!pin || !/^\d{4,12}$/.test(String(pin))) {
      throw new AppError(400, 'PIN phải gồm 4–12 chữ số');
    }
    const pinHash = await argon2.hash(String(pin));
    await pool.query(
      `INSERT INTO sys_user_pins (user_id, pin_hash, created_at, updated_at)
       VALUES ($1, $2, now(), now())
       ON CONFLICT (user_id) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, updated_at = now()`,
      [userId, pinHash]
    );
    return { ok: true };
  }

  /** Người dùng đã đặt PIN ký số chưa? */
  static async hasPin(userId) {
    const { rows } = await pool.query(
      'SELECT 1 FROM sys_user_pins WHERE user_id = $1 LIMIT 1',
      [userId]
    );
    return rows.length > 0;
  }

  /** Xác thực PIN ký số của người dùng. Trả về true/false. */
  static async verifyPin(userId, pin) {
    const { rows } = await pool.query(
      'SELECT pin_hash FROM sys_user_pins WHERE user_id = $1',
      [userId]
    );
    if (!rows[0]) throw new AppError(400, 'Bạn chưa thiết lập PIN ký số');
    try {
      return await argon2.verify(rows[0].pin_hash, String(pin ?? ''));
    } catch {
      return false;
    }
  }

  /** Tạo SHA-256 hex từ thông tin ký để làm bằng chứng nội dung. */
  static computeHash({ userId, entityType, entityId, action, payload }) {
    const material = JSON.stringify({
      userId,
      entityType,
      entityId,
      action,
      payload: payload ?? null,
      at: new Date().toISOString().slice(0, 19), // tới giây
    });
    return crypto.createHash('sha256').update(material).digest('hex');
  }

  /**
   * Ký một thực thể: xác thực PIN, ghi dòng chữ ký bất biến.
   * @returns {Promise<object>} bản ghi sys_signatures vừa tạo.
   */
  static async sign(userId, pin, entityType, entityId, action, payload = null) {
    if (!userId) throw new AppError(401, 'Chưa xác thực người dùng');
    if (!entityType || !entityId || !action) {
      throw new AppError(400, 'Thiếu thông tin thực thể ký');
    }

    const okPin = await this.verifyPin(userId, pin);
    if (!okPin) throw new AppError(400, 'PIN không chính xác', { code: 'PIN_INCORRECT' });

    const signedHash = this.computeHash({ userId, entityType, entityId, action, payload });

    const { rows } = await pool.query(
      `INSERT INTO sys_signatures
         (user_id, entity_type, entity_id, action, signed_hash, pin_verified, signed_at)
       VALUES ($1, $2, $3, $4, $5, TRUE, now())
       RETURNING *`,
      [userId, entityType, String(entityId), action, signedHash]
    );
    return rows[0];
  }

  /** Lấy lịch sử chữ ký của một thực thể (mới nhất trước). */
  static async listForEntity(entityType, entityId) {
    const { rows } = await pool.query(
      `SELECT s.*, u.full_name AS signer_name, u.username AS signer_username
         FROM sys_signatures s
         LEFT JOIN sys_users u ON u.id = s.user_id
        WHERE s.entity_type = $1 AND s.entity_id = $2
        ORDER BY s.signed_at DESC`,
      [entityType, String(entityId)]
    );
    return rows;
  }
}
