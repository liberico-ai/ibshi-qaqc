import crypto from 'node:crypto';
import argon2 from 'argon2';
import { pool } from '../../../../core/db.js';
import { AppError } from '../../../../core/errors.js';
import { MFAService } from './MFAService.js';

export class SignatureService {
  static async enrollPIN(userId, pin) {
    if (!/^\d{6}$/.test(pin)) throw new AppError(400, 'PIN phải là 6 chữ số');
    const hash = await argon2.hash(pin, { type: argon2.argon2id });
    await pool.query(
      'UPDATE sys_users SET sign_pin_hash=$1, updated_at=now() WHERE id=$2',
      [hash, userId]
    );
  }

  static async verifySignature(userId, { pin, otpToken, entityType, entityId, docPayload }, meta = {}) {
    const { rows } = await pool.query(
      'SELECT sign_pin_hash FROM sys_users WHERE id=$1',
      [userId]
    );
    if (!rows[0]?.sign_pin_hash) {
      throw new AppError(400, 'Chưa đặt PIN ký số. Vào Profile > Chữ ký số để đặt PIN.');
    }

    const pinValid = await argon2.verify(rows[0].sign_pin_hash, pin);
    if (!pinValid) throw new AppError(400, 'PIN không đúng');

    const factors = await MFAService.listFactors(userId);
    const totpFactor = factors.find(f => f.factor_type === 'totp');
    if (!totpFactor) {
      throw new AppError(400, 'Chưa cấu hình TOTP. Vào Profile > MFA để thiết lập.');
    }
    await MFAService.verifyFactor(totpFactor.id, userId, otpToken, meta);

    const docHash = SignatureService.computeDocHash(docPayload);

    const { rows: sig } = await pool.query(
      `INSERT INTO sys_signatures
         (user_id, entity_type, entity_id, doc_hash, ip, user_agent, pin_verified, otp_verified)
       VALUES ($1,$2,$3,$4,$5,$6,true,true)
       RETURNING *`,
      [userId, entityType, entityId, docHash, meta.ip ?? null, meta.userAgent ?? null]
    );
    return sig[0];
  }

  static computeDocHash(payload) {
    const canonical = JSON.stringify(payload, Object.keys(payload).sort());
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  static async getSignature(entityType, entityId) {
    const { rows } = await pool.query(
      `SELECT s.*, u.full_name, u.username,
              sv.id AS void_id, sv.reason AS void_reason, sv.voided_at
       FROM sys_signatures s
       JOIN sys_users u ON u.id = s.user_id
       LEFT JOIN sys_signature_voids sv ON sv.signature_id = s.id
       WHERE s.entity_type=$1 AND s.entity_id=$2
       ORDER BY s.signed_at DESC LIMIT 1`,
      [entityType, entityId]
    );
    if (!rows[0]) return null;
    const r = rows[0];
    return {
      id: r.id,
      signedBy: r.full_name ?? r.username,
      signedAt: r.signed_at,
      method: r.method,
      ip: r.ip,
      docHash: r.doc_hash,
      isVoided: !!r.void_id,
      voidReason: r.void_reason ?? null,
      voidedAt: r.voided_at ?? null,
    };
  }

  static async requireSignature(entityType, entityId) {
    const sig = await SignatureService.getSignature(entityType, entityId);
    if (!sig || sig.isVoided) {
      throw new AppError(403, 'Thao tác này yêu cầu chữ ký số. Vui lòng ký trước khi tiếp tục.');
    }
    return sig;
  }

  static async assertNotSigned(entityType, entityId) {
    const sig = await SignatureService.getSignature(entityType, entityId);
    if (sig && !sig.isVoided) {
      throw new AppError(403, 'Tài liệu đã có chữ ký số và không thể chỉnh sửa.', { code: 'DOCUMENT_SIGNED' });
    }
  }

  static async voidSignature(voiderId, signatureId, reason) {
    const { rows } = await pool.query('SELECT id FROM sys_signatures WHERE id=$1', [signatureId]);
    if (!rows[0]) throw new AppError(404, 'Chữ ký không tồn tại');

    const { rows: existing } = await pool.query(
      'SELECT id FROM sys_signature_voids WHERE signature_id=$1',
      [signatureId]
    );
    if (existing[0]) throw new AppError(409, 'Chữ ký đã bị thu hồi trước đó');

    await pool.query(
      'INSERT INTO sys_signature_voids (signature_id, voided_by, reason) VALUES ($1,$2,$3)',
      [signatureId, voiderId, reason]
    );
  }
}
