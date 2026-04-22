import { pool } from '../../../../core/db.js';

class NotificationChannelRepository {
  async completeLinkByCode(channelClass, code, identity) {
    const { rows } = await pool.query(
      `UPDATE sys_user_channel_identities
       SET identity = $1,
           is_verified = TRUE,
           linked_at = now(),
           updated_at = now(),
           link_code = NULL,
           link_code_expires_at = NULL
       WHERE channel_class = $2
         AND link_code = $3
         AND link_code_expires_at > now()
       RETURNING user_id, channel_class, identity`,
      [identity, channelClass, code]
    );
    if (!rows[0]) throw new Error('Mã liên kết không hợp lệ hoặc đã hết hạn');
    return rows[0];
  }
}

export const notificationChannelRepo = new NotificationChannelRepository();
