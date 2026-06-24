import { SignatureService } from '../services/SignatureService.js';

export class SignatureController {
  /** GET /api/system/signature/status — người dùng đã đặt PIN ký số chưa. */
  static async status(req, res) {
    const hasPin = await SignatureService.hasPin(req.user.id);
    res.json({ hasPin });
  }

  /** POST /api/system/signature/set-pin — đặt/đổi PIN ký số. */
  static async setPin(req, res) {
    const { pin } = req.body ?? {};
    const result = await SignatureService.setPin(req.user.id, pin);
    res.json(result);
  }

  /**
   * POST /api/system/signature/verify — xác thực PIN (không ghi chữ ký).
   * Dùng để kiểm tra PIN trước khi thực hiện hành động.
   */
  static async verify(req, res) {
    const { pin } = req.body ?? {};
    const ok = await SignatureService.verifyPin(req.user.id, pin);
    res.json({ ok });
  }

  /** GET /api/system/signature/:entityType/:entityId — lịch sử chữ ký của thực thể. */
  static async listForEntity(req, res) {
    const { entityType, entityId } = req.params;
    const data = await SignatureService.listForEntity(entityType, entityId);
    res.json({ data });
  }
}
