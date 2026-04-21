import { pool } from '../../../../core/db.js';

class MFARepository {
  // ── Factors ─────────────────────────────────────────────────────

  async getActiveFactors(userId) {
    const { rows } = await pool.query(
      `SELECT id, factor_type, factor_name, use_as_login, config, enrolled_at, last_used_at
       FROM sys_user_mfa_factors
       WHERE user_id = $1 AND status = 'active'
       ORDER BY enrolled_at`,
      [userId]
    );
    return rows;
  }

  async hasActiveFactor(userId) {
    const { rows } = await pool.query(
      `SELECT 1 FROM sys_user_mfa_factors WHERE user_id = $1 AND status = 'active' LIMIT 1`,
      [userId]
    );
    return rows.length > 0;
  }

  async getFactorById(id, userId) {
    const { rows } = await pool.query(
      `SELECT * FROM sys_user_mfa_factors WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [id, userId]
    );
    return rows[0] ?? null;
  }

  async createFactor({ userId, factorType, factorName, config, useAsLogin = false }) {
    const { rows } = await pool.query(
      `INSERT INTO sys_user_mfa_factors (user_id, factor_type, factor_name, config, use_as_login)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, factorType, factorName, config, useAsLogin]
    );
    return rows[0];
  }

  async getActivePasskeyFactors() {
    const { rows } = await pool.query(
      `SELECT id, user_id, config FROM sys_user_mfa_factors
       WHERE factor_type = 'passkey' AND status = 'active'`
    );
    return rows;
  }

  async activateFactor(id, userId) {
    await pool.query(
      `UPDATE sys_user_mfa_factors
       SET status = 'active', enrolled_at = now(), updated_at = now()
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
  }

  async updateFactorConfig(id, userId, config) {
    await pool.query(
      `UPDATE sys_user_mfa_factors SET config = $1, updated_at = now()
       WHERE id = $2 AND user_id = $3`,
      [config, id, userId]
    );
  }

  async updateLastUsed(id) {
    await pool.query(
      `UPDATE sys_user_mfa_factors SET last_used_at = now(), updated_at = now() WHERE id = $1`,
      [id]
    );
  }

  async disableFactor(id, userId) {
    const { rowCount } = await pool.query(
      `UPDATE sys_user_mfa_factors
       SET status = 'disabled', updated_at = now()
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return rowCount > 0;
  }

  async disableAllFactors(userId) {
    await pool.query(
      `UPDATE sys_user_mfa_factors SET status = 'disabled', updated_at = now() WHERE user_id = $1`,
      [userId]
    );
  }

  async deletePendingFactor(id, userId) {
    await pool.query(
      `DELETE FROM sys_user_mfa_factors WHERE id = $1 AND user_id = $2 AND status = 'pending'`,
      [id, userId]
    );
  }

  // ── Backup codes ─────────────────────────────────────────────────

  async insertBackupCodes(userId, hashes) {
    const values = hashes.map((h, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ');
    const params = hashes.flatMap(h => [userId, h]);
    await pool.query(
      `INSERT INTO sys_user_mfa_backup_codes (user_id, code_hash) VALUES ${values}`,
      params
    );
  }

  async getUnusedBackupCodes(userId) {
    const { rows } = await pool.query(
      `SELECT id, code_hash FROM sys_user_mfa_backup_codes
       WHERE user_id = $1 AND used_at IS NULL`,
      [userId]
    );
    return rows;
  }

  async markBackupCodeUsed(id) {
    await pool.query(
      `UPDATE sys_user_mfa_backup_codes SET used_at = now() WHERE id = $1`,
      [id]
    );
  }

  async deleteBackupCodes(userId) {
    await pool.query(
      `DELETE FROM sys_user_mfa_backup_codes WHERE user_id = $1`,
      [userId]
    );
  }

  // ── Attempts (lockout) ───────────────────────────────────────────

  async recordAttempt({ userId, factorType, success, ip, userAgent }) {
    await pool.query(
      `INSERT INTO sys_mfa_attempts (user_id, factor_type, success, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, factorType ?? null, success, ip ?? null, userAgent ?? null]
    );
  }

  async countRecentFailures(userId, windowMinutes = 10) {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS cnt FROM sys_mfa_attempts
       WHERE user_id = $1 AND success = false
         AND attempted_at > now() - ($2 || ' minutes')::interval`,
      [userId, windowMinutes]
    );
    return rows[0].cnt;
  }
}

export const mfaRepo = new MFARepository();
