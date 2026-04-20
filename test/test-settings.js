import { SettingsController } from '../src/modules/system/backend/controllers/SettingsController.js';
import { pool } from '../src/core/db.js';

async function test() {
  try {
    const req = { body: { system_name: 'TEST', default_theme: 'dark', logo_url: '' } };
    const res = { json: console.log };
    await SettingsController.updateSettings(req, res);
    console.log("Success");
  } catch (err) {
    console.error("Error from controller:", err);
  } finally {
    pool.end();
  }
}

test();
