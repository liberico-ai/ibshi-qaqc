import { registerWeldingActions }  from './actions.js';
import { registerWeldingMenus }    from './menus.js';
import { registerWeldingRoutes }   from './routes.js';
import { registerWeldingCronjobs } from './cronjobs.js';

export default async function registerWeldingModule(app) {
  registerWeldingActions();
  registerWeldingMenus();
  registerWeldingRoutes(app);
  registerWeldingCronjobs();
}
