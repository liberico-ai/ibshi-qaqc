import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../src/core/db.js';
import { createLogger } from '../src/core/logger.js';

const log = createLogger('migrate');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const modulesDir = path.resolve(__dirname, '../src/modules');

async function migrate() {
  log.info('Bootstrapping migration table...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const { rows } = await pool.query('SELECT filename FROM migrations');
  const executedFiles = new Set(rows.map(r => r.filename));

  const migrationFiles = [];

  // Scan all modules
  if (fs.existsSync(modulesDir)) {
    const modules = fs.readdirSync(modulesDir);
    for (const mod of modules) {
      const migrateDir = path.join(modulesDir, mod, 'migrations');
      if (fs.existsSync(migrateDir) && fs.statSync(migrateDir).isDirectory()) {
        const files = fs.readdirSync(migrateDir).filter(f => f.endsWith('.sql'));
        for (const file of files) {
          migrationFiles.push({
            mod,
            filename: file,
            filepath: path.join(migrateDir, file)
          });
        }
      }
    }
  }

  // Sort by filename. Usually starts with 001_, 002_, or timestamp.
  migrationFiles.sort((a, b) => a.filename.localeCompare(b.filename));

  for (const { mod, filename, filepath } of migrationFiles) {
    if (!executedFiles.has(filename)) {
      log.info(`[${mod}] Executing migration: ${filename}`);
      const sql = fs.readFileSync(filepath, 'utf8');
      
      try {
        await pool.query('BEGIN');
        await pool.query(sql);
        await pool.query('INSERT INTO migrations(filename) VALUES($1)', [filename]);
        await pool.query('COMMIT');
        log.info(`[${mod}] Successfully migrated: ${filename}`);
      } catch (err) {
        await pool.query('ROLLBACK');
        log.error(err, `[${mod}] Migration failed: ${filename}`);
        process.exit(1);
      }
    }
  }

  log.info('All migrations checked/executed successfully.');
  await pool.end();
}

migrate().catch(err => {
  log.fatal(err, 'Fatal error during migration');
  process.exit(1);
});
