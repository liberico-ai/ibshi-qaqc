import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from './logger.js';

const log = createLogger('backend-loader');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const modulesDir = path.resolve(__dirname, '../modules');

export async function loadBackendModules(app) {
  if (!fs.existsSync(modulesDir)) return;
  
  const modules = fs.readdirSync(modulesDir);
  for (const mod of modules) {
    // Check if it's a directory
    const modPath = path.join(modulesDir, mod);
    if (!fs.statSync(modPath).isDirectory()) continue;

    const backendIndexPath = path.join(modPath, 'backend', 'index.js');
    if (fs.existsSync(backendIndexPath)) {
      try {
        const moduleExports = await import(`../modules/${mod}/backend/index.js`);
        if (typeof moduleExports.default === 'function') {
          moduleExports.default(app);
        }
        log.info(`Loaded module: ${mod}`);
      } catch (err) {
        log.error(err, `Failed to load module: ${mod}`);
      }
    }
  }
}
