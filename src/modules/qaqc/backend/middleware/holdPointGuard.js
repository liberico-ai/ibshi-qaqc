import { pool } from '../../../../core/db.js';
import { HoldPointService } from '../services/HoldPointService.js';

export async function holdPointGuard(req, _res, next) {
  const itemId = req.body?.item_id;
  if (!itemId) return next();

  const { rows } = await pool.query(
    'SELECT plan_id, seq FROM qaqc_itp_items WHERE id=$1',
    [itemId]
  );
  if (!rows[0]) return next();

  const { plan_id, seq } = rows[0];
  const { blocked, blockingItems } = await HoldPointService.checkBlocking(plan_id, seq);

  if (blocked) {
    return _res.status(409).json({
      error: 'HOLD_POINT_NOT_RELEASED',
      blocking: blockingItems.map(i => i.ip_code),
      message: `${blockingItems[0].ip_code} là Hold Point chưa được release`,
    });
  }
  next();
}
