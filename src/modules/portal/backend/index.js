import { registerPortalActions } from './actions.js';
import { registerPortalMenus }   from './menus.js';
import { registerPortalRoutes }  from './routes.js';

export default async function registerPortalModule(app) {
  registerPortalActions();
  registerPortalMenus();
  registerPortalRoutes(app);
}
