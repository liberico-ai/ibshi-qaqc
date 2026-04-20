import { pool } from './db.js';
import jwt from 'jsonwebtoken';
import { createLogger } from './logger.js';
import { getRequestContext } from './request-context.js';

const log = createLogger('permission');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('FATAL: JWT_SECRET environment variable is required');

/**
 * Middleware bảo vệ route bằng việc kiểm tra phân quyền (Action)
 * Dựa trên cấu trúc user_roles -> role_actions
 */
export function requireAction(actionName) {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
         return res.status(401).json({ error: 'Cần đăng nhập' });
      }
      
      const token = authHeader.split(' ')[1];
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch(e) {
        return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' });
      }
      
      req.user = decoded;
      const userId = decoded.id;

      // Ghi user vào request context để audit-log có thể đọc
      const ctx = getRequestContext();
      if (ctx) {
        ctx.userId    = userId;
        ctx.username  = decoded.username;
        ctx.ipAddress = req.ip || req.socket?.remoteAddress || null;
      }

      // Kiểm tra trạng thái is_active và is_admin từ DB
      const userStatusQ = await pool.query('SELECT is_admin, is_active FROM sys_users WHERE id = $1 LIMIT 1', [userId]);
      if (userStatusQ.rowCount === 0) {
        return res.status(401).json({ error: 'Người dùng không tồn tại' });
      }
      if (!userStatusQ.rows[0].is_active) {
        return res.status(403).json({ error: 'Tài khoản của bạn đã bị vô hiệu hóa.' });
      }
      req.user.is_admin = userStatusQ.rows[0].is_admin;      
      if (req.user.is_admin === true) {
        return next(); // Bóp nghẹt mọi check quyền, pass luôn 
      }

      // Check xem user này có role nào mang actionName được yêu cầu không
      if (actionName) {
         const query = `
           SELECT 1 
           FROM sys_user_roles ur
           JOIN sys_role_actions ra ON ur.role_id = ra.role_id
           WHERE ur.user_id = $1 AND ra.action_name = $2
           LIMIT 1
         `;
         const { rowCount } = await pool.query(query, [userId, actionName]);

         if (rowCount === 0) {
           return res.status(403).json({ error: `Forbidden. Bạn không có quyền thực hiện hành động: ${actionName}` });
         }
      }

      next();
    } catch (err) {
      log.error(err, 'Permission check error');
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };
}
