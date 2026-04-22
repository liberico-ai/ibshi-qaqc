import { SignatureService } from '../services/SignatureService.js';
import { AppError } from '../../../../core/errors.js';

export class SignatureController {
  static async enrollPIN(req, res) {
    const { pin } = req.body;
    await SignatureService.enrollPIN(req.user.id, pin);
    res.json({ ok: true });
  }

  static async sign(req, res) {
    const { pin, otp_token, entity_type, entity_id, doc_payload } = req.body;
    const meta = { ip: req.ip, userAgent: req.headers['user-agent'] };
    const sig = await SignatureService.verifySignature(
      req.user.id,
      { pin, otpToken: otp_token, entityType: entity_type, entityId: entity_id, docPayload: doc_payload ?? {} },
      meta
    );
    res.status(201).json({ data: sig });
  }

  static async getSignature(req, res) {
    const { entityType, entityId } = req.params;
    const sig = await SignatureService.getSignature(entityType, entityId);
    res.json({ data: sig });
  }

  static async voidSignature(req, res) {
    const { reason } = req.body;
    if (!reason?.trim()) throw new AppError(400, 'reason required');
    await SignatureService.voidSignature(req.user.id, req.params.id, reason);
    res.json({ ok: true });
  }
}
