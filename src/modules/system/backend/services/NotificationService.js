import { getSystemIo } from '../socket.js';
import { notificationsRepo } from '../repositories/NotificationsRepository.js';

export class NotificationService {
  /**
   * Send a notification to a specific target.
   * @param {Object} params
   * @param {string} [params.targetType='USER']
   * @param {number} params.targetId
   * @param {string} params.title
   * @param {string} params.message
   * @param {string} [params.type='INFO']  - INFO|WARNING|SUCCESS|ERROR
   * @param {string} [params.link=null]
   * @param {number} [params.senderId=null]
   * @returns {Promise<object>}
   */
  static async sendNotification({ targetType = 'USER', targetId, title, message, type = 'INFO', link = null, senderId = null }) {
    const notification = await notificationsRepo.createNotification({
      targetType, targetId, title, message, type, link, senderId,
    });

    if (targetType === 'USER') {
      const io = getSystemIo();
      if (io) io.to(`user_${targetId}`).emit('notification:new', notification);
    }

    return notification;
  }
}
