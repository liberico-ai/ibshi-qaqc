import { registerCalibrationActions }  from './actions.js';
import { registerCalibrationMenus }    from './menus.js';
import { registerCalibrationRoutes }   from './routes.js';
import { registerCalibrationCronjobs } from './cronjobs.js';

export default async function registerCalibrationModule(app) {
  registerCalibrationActions();
  registerCalibrationMenus();
  registerCalibrationRoutes(app);
  registerCalibrationCronjobs();
}
