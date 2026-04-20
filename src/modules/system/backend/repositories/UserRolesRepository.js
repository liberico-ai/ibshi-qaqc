import { Repository } from '../../../../core/db.js';

/**
 * Junction table sys_user_roles (user_id, role_id).
 * Dùng cho các thao tác gán/bỏ role — không có identity đơn lẻ nên
 * thường chỉ dùng bulkCreate + deleteWhere.
 */
class UserRolesRepository extends Repository {
  constructor() {
    super('sys_user_roles', { trackActor: true });
  }
}

export const userRolesRepo = new UserRolesRepository();
