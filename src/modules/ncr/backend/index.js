import { registerNCRActions }  from './actions.js';
import { registerNCRMenus }    from './menus.js';
import { registerNCRRoutes }   from './routes.js';
import { registerNCRCronjobs } from './cronjobs.js';

export default async function registerNCRModule(app) {
  registerNCRActions();
  registerNCRMenus();
  registerNCRRoutes(app);
  registerNCRCronjobs();
}
