import { registerNDTActions } from './actions.js';
import { registerNDTMenus }   from './menus.js';
import { registerNDTRoutes }  from './routes.js';

export default async function registerNDTModule(app) {
  registerNDTActions();
  registerNDTMenus();
  registerNDTRoutes(app);
}
