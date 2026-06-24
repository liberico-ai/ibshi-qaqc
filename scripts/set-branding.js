/**
 * set-branding.js — đặt thương hiệu hệ thống về "IBS QA/QC Platform".
 *
 * Migration 008 chỉ INSERT khi key chưa tồn tại (ON CONFLICT DO NOTHING),
 * nên với CSDL đã cài sẵn (đang để "Libe Move") cần script này để cập nhật.
 *
 * Chạy:  node --env-file=.env scripts/set-branding.js
 * Idempotent — chạy nhiều lần vẫn an toàn.
 */
import { pool } from '../src/core/db.js';
import { createLogger } from '../src/core/logger.js';

const log = createLogger('set-branding');

const SETTINGS = [
  { key: 'system_name',   value: 'IBS QA/QC Platform', description: 'Tên hệ thống hiển thị chung' },
  { key: 'default_theme', value: 'light',              description: 'Giao diện sáng / tối (light/dark)' },
];

async function run() {
  log.info('--- Đặt thương hiệu hệ thống ---');
  for (const s of SETTINGS) {
    await pool.query(
      `INSERT INTO sys_settings (key, value, description)
       VALUES ($1, $2, $3)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [s.key, s.value, s.description]
    );
    log.info(`  ✓ ${s.key} = ${s.value}`);
  }
  log.info('Hoàn tất.');
}

run()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch(async (err) => {
    log.error(err, 'set-branding thất bại');
    await pool.end().catch(() => {});
    process.exit(1);
  });
