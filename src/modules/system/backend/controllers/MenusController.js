import { hooks } from '../../../../core/hooks.js';
import { usersRepo } from '../repositories/UsersRepository.js';

export class MenusController {
  static async getMenus(req, res) {
    const allMenus = await hooks.applyFilters('system.menus', []);
    const user = req.user;

    const userActions = user.is_admin ? new Set() : await usersRepo.getUserActionsSet(user.id);

    const hasAccess = (permission) => {
      if (!permission) return true;
      if (user.is_admin) return true;
      return userActions.has(permission);
    };

    const filteredMenus = allMenus.map(section => {
      if (!hasAccess(section.permission)) return null;
      const items = section.items ? section.items.filter(item => hasAccess(item.permission)) : [];
      if (section.items && section.items.length > 0 && items.length === 0) return null;
      return { ...section, items };
    }).filter(Boolean);

    filteredMenus.sort((a, b) => (a.order || 0) - (b.order || 0));
    res.json({ menus: filteredMenus });
  }
}
