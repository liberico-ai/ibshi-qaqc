import { Repository, transaction } from '../../../../core/db.js';
import { userRolesRepo } from './UserRolesRepository.js';

class UsersRepository extends Repository {
  constructor() {
    super('sys_users', {
      sensitiveFields: ['password_hash', 'failed_login_count'],
      trackActor: true,
    });
  }

  async findByUsername(username) {
    const { rows } = await this.query(
      'SELECT * FROM sys_users WHERE username = $1 LIMIT 1',
      [username]
    );
    return rows[0] ?? null;
  }

  async findByIdSafe(id) {
    const { rows } = await this.query(
      'SELECT id, full_name, username, is_admin, is_active FROM sys_users WHERE id = $1',
      [id]
    );
    return rows[0] ?? null;
  }

  async findStatusById(id) {
    const { rows } = await this.query(
      'SELECT id, is_admin, is_active FROM sys_users WHERE id = $1 LIMIT 1',
      [id]
    );
    return rows[0] ?? null;
  }

  async findAllWithRoles({ limit, offset }) {
    const countRes = await this.query('SELECT COUNT(*)::int AS total FROM sys_users');
    const total = countRes.rows[0].total;

    const { rows } = await this.query(`
      SELECT u.id, u.full_name, u.username, u.is_admin, u.is_active, u.created_at,
             COALESCE(
               json_agg(json_build_object('id', r.id, 'name', r.name))
                 FILTER (WHERE r.id IS NOT NULL),
               '[]'::json
             ) AS roles
      FROM sys_users u
      LEFT JOIN sys_user_roles ur ON u.id = ur.user_id
      LEFT JOIN sys_roles r ON ur.role_id = r.id
      GROUP BY u.id
      ORDER BY u.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    return { rows, total };
  }

  async createWithRoles({ full_name, username, password_hash, roles = [] }) {
    return transaction(async () => {
      const user = await this.create({ full_name, username, password_hash });
      if (Array.isArray(roles) && roles.length > 0) {
        await userRolesRepo.bulkCreate(
          roles.map(role_id => ({ user_id: user.id, role_id }))
        );
      }
      return user;
    });
  }

  async updateWithRoles(id, data, roles) {
    return transaction(async () => {
      const user = Object.keys(data).length > 0
        ? await this.update(id, data)
        : await this.findOne(id);

      if (roles !== undefined) {
        await this._syncUserRoles(Number(id), roles);
      }
      return user;
    });
  }

  /**
   * Đồng bộ junction table sys_user_roles theo diff — chỉ thêm roles mới
   * và xóa roles không còn trong danh sách. Không động các row đã đúng.
   */
  async _syncUserRoles(userId, newRoles) {
    const existing = await userRolesRepo.find({ user_id: userId });
    const existingIds = new Set(existing.map(r => r.role_id));
    const newIds = new Set((newRoles || []).map(Number));

    const toAdd = [...newIds].filter(r => !existingIds.has(r));
    const toRemove = [...existingIds].filter(r => !newIds.has(r));

    if (toAdd.length > 0) {
      await userRolesRepo.bulkCreate(
        toAdd.map(role_id => ({ user_id: userId, role_id }))
      );
    }
    for (const role_id of toRemove) {
      await userRolesRepo.deleteWhere({ user_id: userId, role_id });
    }
  }

  async recordSuccessfulLogin(id) {
    // Login flow chưa có auth context → pass actor explicit để ghi updated_by
    await this.updateWhere(
      { id: Number(id) },
      { failed_login_count: 0, last_login_at: new Date(), updated_by: Number(id) }
    );
  }

  async incrementFailedLogin(id) {
    return this.increment(id, 'failed_login_count');
  }

  async getUserActions(userId) {
    const { rows } = await this.query(`
      SELECT DISTINCT ra.action_name
      FROM sys_user_roles ur
      JOIN sys_role_actions ra ON ur.role_id = ra.role_id
      WHERE ur.user_id = $1
    `, [userId]);
    return rows.map(r => r.action_name);
  }

  async getUserActionsSet(userId) {
    return new Set(await this.getUserActions(userId));
  }

  async hasAction(userId, actionName) {
    const { rows } = await this.query(`
      SELECT 1
      FROM sys_user_roles ur
      JOIN sys_role_actions ra ON ur.role_id = ra.role_id
      WHERE ur.user_id = $1 AND ra.action_name = $2
      LIMIT 1
    `, [userId, actionName]);
    return rows.length > 0;
  }
}

export const usersRepo = new UsersRepository();
