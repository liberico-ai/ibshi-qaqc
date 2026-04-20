import { Repository } from '../../../../core/db.js';

/**
 * Junction sys_role_actions (role_id, action_name, module).
 */
class RoleActionsRepository extends Repository {
  constructor() {
    super('sys_role_actions', { trackActor: true });
  }
}

export const roleActionsRepo = new RoleActionsRepository();
