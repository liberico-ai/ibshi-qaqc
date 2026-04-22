import { pool } from '../../../../core/db.js';
import { AppError } from '../../../../core/errors.js';

const ALLOWED_KEYS = ['language', 'timezone', 'date_format', 'theme'];
const ALLOWED_LANGUAGES = ['vi', 'en'];

export class UserPreferencesController {
  // GET /api/system/users/me/preferences
  static async getMyPreferences(req, res) {
    const userId = req.user.id;
    const { rows } = await pool.query('SELECT preferences FROM sys_users WHERE id = $1', [userId]);
    if (!rows[0]) throw new AppError(404, 'User not found');
    res.json({ data: rows[0].preferences ?? {} });
  }

  // PUT /api/system/users/me/preferences — body is a flat object
  static async updateMyPreferences(req, res) {
    const userId = req.user.id;
    const incoming = req.body ?? {};

    const clean = {};
    for (const key of ALLOWED_KEYS) {
      if (key in incoming) clean[key] = incoming[key];
    }
    if (clean.language && !ALLOWED_LANGUAGES.includes(clean.language)) {
      throw new AppError(400, `language phải là một trong: ${ALLOWED_LANGUAGES.join(', ')}`);
    }

    const { rows } = await pool.query(
      `UPDATE sys_users
       SET preferences = COALESCE(preferences, '{}'::jsonb) || $1::jsonb,
           updated_at = now()
       WHERE id = $2
       RETURNING preferences`,
      [JSON.stringify(clean), userId]
    );
    res.json({ data: rows[0].preferences });
  }
}
