import { registerMDRActions }  from './actions.js';
import { registerMDRMenus }    from './menus.js';
import { registerMDRRoutes }   from './routes.js';
import { registerMDRCronjobs } from './cronjobs.js';

export default async function registerMDRModule(app) {
  registerMDRActions();
  registerMDRMenus();
  registerMDRRoutes(app);
  registerMDRCronjobs();
}
