import { pool, transaction } from '../../../../core/db.js';
import { AppError } from '../../../../core/errors.js';
import { hooks } from '../../../../core/hooks.js';
import { SignatureService } from '../../../system/backend/services/SignatureService.js';

export class HoldPointService {
  static async checkBlocking(planId, targetItemSeq) {
    const { rows } = await pool.query(
      `SELECT i.id, i.ip_code, i.hold_type, i.seq
       FROM qaqc_itp_items i
       LEFT JOIN qaqc_itp_ip_releases r ON r.item_id = i.id
       WHERE i.plan_id = $1
         AND i.seq < $2
         AND i.hold_type IN ('H', 'HC')
         AND r.id IS NULL
       ORDER BY i.seq`,
      [planId, targetItemSeq]
    );
    return {
      blocked: rows.length > 0,
      blockingItems: rows,
    };
  }

  static async getHoldStatus(planId) {
    const { rows } = await pool.query(
      `SELECT i.id, i.ip_code, i.hold_type, i.seq,
              r.id AS release_id, r.released_by, r.released_at, r.comment, r.is_override,
              u.full_name AS released_by_name
       FROM qaqc_itp_items i
       LEFT JOIN qaqc_itp_ip_releases r ON r.item_id = i.id
       LEFT JOIN sys_users u ON u.id = r.released_by
       WHERE i.plan_id = $1 AND i.hold_type IN ('H', 'HC')
       ORDER BY i.seq`,
      [planId]
    );
    const status = {};
    for (const r of rows) {
      status[r.id] = {
        ip_code: r.ip_code,
        hold_type: r.hold_type,
        seq: r.seq,
        released: !!r.release_id,
        release: r.release_id ? {
          id: r.release_id,
          releasedBy: r.released_by_name,
          releasedAt: r.released_at,
          comment: r.comment,
          isOverride: r.is_override,
        } : null,
      };
    }
    return status;
  }

  static async getPendingHoldPoints(projectId) {
    const { rows } = await pool.query(
      `SELECT i.id, i.ip_code, i.hold_type, i.seq, p.id AS plan_id, p.project_id
       FROM qaqc_itp_items i
       JOIN qaqc_inspection_plans p ON p.id = i.plan_id
       LEFT JOIN qaqc_itp_ip_releases r ON r.item_id = i.id
       WHERE ($1::uuid IS NULL OR p.project_id = $1)
         AND i.hold_type IN ('H', 'HC')
         AND r.id IS NULL
       ORDER BY p.project_id, i.seq`,
      [projectId ?? null]
    );
    return rows;
  }

  static async releaseHoldPoint(itemId, { userId, comment, signatureId }) {
    if (!comment || comment.length < 20) {
      throw new AppError(400, 'Comment phải có ít nhất 20 ký tự');
    }

    const { rows: item } = await pool.query(
      'SELECT id, hold_type FROM qaqc_itp_items WHERE id=$1',
      [itemId]
    );
    if (!item[0]) throw new AppError(404, 'Inspection Point không tồn tại');
    if (!['H', 'HC'].includes(item[0].hold_type)) {
      throw new AppError(400, 'Inspection Point này không phải Hold Point');
    }

    const { rows: existing } = await pool.query(
      'SELECT id FROM qaqc_itp_ip_releases WHERE item_id=$1',
      [itemId]
    );
    if (existing[0]) throw new AppError(409, 'Hold Point này đã được release');

    if (signatureId) {
      const sig = await SignatureService.getSignature('HOLD_RELEASE', itemId);
      if (!sig || sig.isVoided || sig.id !== signatureId) {
        throw new AppError(403, 'Chữ ký số không hợp lệ');
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO qaqc_itp_ip_releases (item_id, released_by, comment, signature_id, is_override)
       VALUES ($1,$2,$3,$4,false) RETURNING *`,
      [itemId, userId, comment, signatureId ?? null]
    );

    await hooks.doAction('qaqc.notification.event', {
      eventType: 'HOLD_POINT_RELEASED',
      payload: {
        title: 'Hold Point released',
        message: `Hold Point đã được release bởi user ${userId}`,
        itemId,
        link: `/qaqc/itp`,
      },
      userIds: [userId],
    });

    return rows[0];
  }

  static async overrideHoldPoint(itemId, { userId, reason, signatureId }) {
    if (!reason || reason.length < 50) {
      throw new AppError(400, 'Lý do override phải có ít nhất 50 ký tự');
    }

    const { rows: item } = await pool.query(
      'SELECT id, ip_code, hold_type FROM qaqc_itp_items WHERE id=$1',
      [itemId]
    );
    if (!item[0]) throw new AppError(404, 'Inspection Point không tồn tại');
    if (!['H', 'HC'].includes(item[0].hold_type)) {
      throw new AppError(400, 'Inspection Point này không phải Hold Point');
    }

    if (signatureId) {
      const sig = await SignatureService.getSignature('HOLD_OVERRIDE', itemId);
      if (!sig || sig.isVoided || sig.id !== signatureId) {
        throw new AppError(403, 'Chữ ký số không hợp lệ');
      }
    }

    await transaction(async (client) => {
      await client.query(
        `INSERT INTO sys_overrides (override_type, entity_id, reason, performed_by, signature_id)
         VALUES ('HOLD_POINT',$1,$2,$3,$4)`,
        [itemId, reason, userId, signatureId ?? null]
      );
      const { rows: existing } = await client.query(
        'SELECT id FROM qaqc_itp_ip_releases WHERE item_id=$1',
        [itemId]
      );
      if (!existing[0]) {
        await client.query(
          `INSERT INTO qaqc_itp_ip_releases (item_id, released_by, comment, signature_id, is_override)
           VALUES ($1,$2,$3,$4,true)`,
          [itemId, userId, reason.slice(0, 200), signatureId ?? null]
        );
      }
    });

    await hooks.doAction('qaqc.notification.event', {
      eventType: 'HOLD_POINT_OVERRIDE',
      payload: {
        title: '⚠ Hold Point Override',
        message: `Hold Point ${item[0].ip_code} đã bị override bởi user ${userId}. Lý do: ${reason.slice(0, 200)}`,
        itemId,
        link: `/qaqc/itp`,
      },
      userIds: [userId],
    });
  }
}
