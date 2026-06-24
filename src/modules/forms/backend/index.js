import { registerFormsActions } from './actions.js';
import { registerFormsMenus }   from './menus.js';
import { registerFormsRoutes }  from './routes.js';

export default async function registerFormsModule(app) {
  registerFormsActions();
  registerFormsMenus();
  registerFormsRoutes(app);
}
