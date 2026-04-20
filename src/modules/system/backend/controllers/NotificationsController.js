import { paginate } from '../../../../core/db.js';
import { AppError } from '../../../../core/errors.js';
import { notificationsRepo } from '../repositories/NotificationsRepository.js';

export class NotificationsController {
  static async getMyNotifications(req, res) {
    const { limit, offset, page } = paginate(req);
    const { rows, total } = await notificationsRepo.findForUser(req.user.id, { limit, offset });
    res.json({
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  static async getUnreadCount(req, res) {
    const count = await notificationsRepo.unreadCountForUser(req.user.id);
    res.json({ count });
  }

  static async markAsRead(req, res) {
    const updated = await notificationsRepo.markRead(req.params.id, req.user.id);
    if (!updated) throw new AppError(404, 'Notification not found');
    res.json(updated);
  }

  static async markAllAsRead(req, res) {
    await notificationsRepo.markAllReadForUser(req.user.id);
    res.json({ success: true });
  }
}
