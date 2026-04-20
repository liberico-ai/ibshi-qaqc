import { pool } from './db.js';
import { getRequestContext } from './request-context.js';
import { createLogger } from './logger.js';

const log = createLogger('audit-log');

// Bỏ qua các bảng hệ thống để tránh vòng lặp vô hạn
const SKIP_TABLES = new Set([
  'sys_logs',
  'sys_cronjob_logs',
  'sys_notifications',
]);

class AuditLogService {
  #enabled = true;
  #retentionDays = 90;

  /**
   * Đồng bộ cấu hình từ settings object (gọi khi server khởi động hoặc settings thay đổi)
   * @param {{ sys_log_enabled?: string, sys_log_retention_days?: string }} settings
   */
  syncFromSettings(settings) {
    if (settings.sys_log_enabled !== undefined) {
      this.#enabled = settings.sys_log_enabled !== 'false' && settings.sys_log_enabled !== '0';
    }
    if (settings.sys_log_retention_days !== undefined) {
      const days = parseInt(settings.sys_log_retention_days, 10);
      this.#retentionDays = isNaN(days) ? 90 : Math.max(0, days);
    }
  }

  isEnabled() { return this.#enabled; }
  getRetentionDays() { return this.#retentionDays; }

  /**
   * Ghi một entry vào sys_logs.
   * - Trong transaction: buffer vào ctx.auditBuffer, sẽ flush sau COMMIT (bởi transaction()).
   * - Ngoài transaction: fire-and-forget qua _write().
   *
   * @param {{ action: string, tableName: string, entityId?: string|number, newData?: object|null }} params
   */
  log({ action, tableName, entityId = null, newData = null }) {
    if (!this.#enabled) return;
    if (SKIP_TABLES.has(tableName)) return;

    const ctx = getRequestContext();
    const entry = {
      userId:    ctx?.userId    ?? null,
      username:  ctx?.username  ?? 'system',
      ipAddress: ctx?.ipAddress ?? null,
      action,
      tableName,
      entityId:  entityId !== null && entityId !== undefined ? String(entityId) : null,
      newData,
      category:  `${tableName}:${action}`,
    };

    if (ctx?.auditBuffer) {
      ctx.auditBuffer.push(entry);   // trong transaction → buffer, flush sau COMMIT
    } else {
      this._write(entry);            // ngoài transaction → ghi ngay
    }
  }

  /**
   * Internal — thực hiện INSERT vào sys_logs qua pool (không qua txClient).
   * Được gọi bởi:
   *   - log() khi ngoài transaction
   *   - transaction() sau COMMIT, để flush buffer
   */
  _write(entry) {
    pool.query(
      `INSERT INTO sys_logs
         (user_id, username, action, category, entity_table, entity_id, new_data, ip_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        entry.userId,
        entry.username,
        entry.action,
        entry.category,
        entry.tableName,
        entry.entityId,
        entry.newData ? JSON.stringify(entry.newData) : null,
        entry.ipAddress,
      ]
    ).catch(err => log.error({ err }, 'Failed to write audit log'));
  }

  /**
   * Xóa các log quá hạn. Trả về số rows đã xóa.
   * @returns {Promise<number>}
   */
  async purgeOldLogs() {
    if (this.#retentionDays <= 0) {
      log.info('Audit log retention is disabled (retentionDays=0). Skipping purge.');
      return 0;
    }
    const { rowCount } = await pool.query(
      `DELETE FROM sys_logs WHERE created_at < NOW() - ($1 || ' days')::interval`,
      [String(this.#retentionDays)]
    );
    log.info(`Purged ${rowCount} audit log entries older than ${this.#retentionDays} days.`);
    return rowCount ?? 0;
  }
}

export const auditLog = new AuditLogService();
