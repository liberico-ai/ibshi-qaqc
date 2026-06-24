import { registerDashboardActions }  from './actions.js';
import { registerDashboardMenus }    from './menus.js';
import { registerDashboardRoutes }   from './routes.js';
import { registerDashboardCronjobs } from './cronjobs.js';

export default async function registerDashboardModule(app) {
  registerDashboardActions();
  registerDashboardMenus();
  registerDashboardRoutes(app);
  registerDashboardCronjobs();
}
