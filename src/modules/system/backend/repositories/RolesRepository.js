import { Repository, transaction } from '../../../../core/db.js';
import { roleActionsRepo } from './RoleActionsRepository.js';

class RolesRepository extends Repository {
  constructor() {
    super('sys_roles', { trackActor: true });
  }

  async findAllWithActions({ limit, offset }) {
    const countRes = await this.query('SELECT COUNT(*)::int AS total FROM sys_roles');
    const total = countRes.rows[0].total;

    const { rows } = await this.query(`
      SELECT r.*,
             COALESCE(
               json_agg(ra.action_name) FILTER (WHERE ra.action_name IS NOT NULL),
               '[]'::json
             ) AS actions
      FROM sys_roles r
      LEFT JOIN sys_role_actions ra ON r.id = ra.role_id
      GROUP BY r.id
      ORDER BY r.id ASC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    return { rows, total };
  }

  async createWithActions({ name, description, actions = [] }) {
    return transaction(async () => {
      const role = await this.create({ name, description });
      if (Array.isArray(actions) && actions.length > 0) {
        await roleActionsRepo.bulkCreate(
          actions.map(act => ({ role_id: role.id, action_name: act, module: act.split('.')[0] }))
        );
      }
      return role;
    });
  }

  async updateWithActions(id, data, actions) {
    return transaction(async () => {
      const role = Object.keys(data).length > 0
        ? await this.update(id, data)
        : await this.findOne(id);

      if (actions !== undefined) {
        await this._syncRoleActions(Number(id), actions);
      }
      return role;
    });
  }

  async syncActions(id, actions) {
    return transaction(async () => {
      await this._syncRoleActions(Number(id), actions);
    });
  }

  /**
   * Đồng bộ sys_role_actions theo diff — chỉ thêm actions mới và xóa
   * actions không còn. Không đụng tới row đã đúng.
   */
  async _syncRoleActions(roleId, newActions) {
    const existing = await roleActionsRepo.find({ role_id: roleId });
    const existingNames = new Set(existing.map(r => r.action_name));
    const newNames = new Set(Array.isArray(newActions) ? newActions : []);

    const toAdd = [...newNames].filter(a => !existingNames.has(a));
    const toRemove = [...existingNames].filter(a => !newNames.has(a));

    if (toAdd.length > 0) {
      await roleActionsRepo.bulkCreate(
        toAdd.map(action_name => ({ role_id: roleId, action_name, module: action_name.split('.')[0] }))
      );
    }
    for (const action_name of toRemove) {
      await roleActionsRepo.deleteWhere({ role_id: roleId, action_name });
    }
  }
}

export const rolesRepo = new RolesRepository();
