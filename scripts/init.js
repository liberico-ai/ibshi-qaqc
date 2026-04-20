import argon2 from 'argon2';
import readline from 'readline';
import { pool } from '../src/core/db.js';
import { createLogger } from '../src/core/logger.js';

const log = createLogger('init');

const hashPassword = async (password) => argon2.hash(password);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function initSettings(client) {
  log.info('Initializing sys_settings...');
  const defaultSettings = [
    { key: 'system_name', value: 'Libe Move', description: 'Tên hệ thống hiển thị chung' },
    { key: 'default_theme', value: 'light', description: 'Giao diện sáng / tối (light/dark)' },
    { key: 'logo_url', value: '', description: 'Đường dẫn logo của hệ thống' },
  ];
  for (const s of defaultSettings) {
    await client.query(
      'INSERT INTO sys_settings (key, value, description) VALUES ($1,$2,$3) ON CONFLICT (key) DO NOTHING',
      [s.key, s.value, s.description]
    );
  }
}

async function initSuperRole(client) {
  log.info('Initializing Super Admin role & Permissions...');
  const { rows } = await client.query('SELECT * FROM sys_roles WHERE name = $1', ['Super Admin']);
  let superAdminRole;
  if (rows.length === 0) {
    const { rows: inserted } = await client.query(
      'INSERT INTO sys_roles (name, description) VALUES ($1,$2) RETURNING *',
      ['Super Admin', 'Vai trò quản trị cao nhất, toàn quyền hệ thống.']
    );
    superAdminRole = inserted[0];
  } else {
    superAdminRole = rows[0];
  }

  await client.query(
    'INSERT INTO sys_role_actions (role_id, action_name, module) VALUES ($1,$2,$3) ON CONFLICT (role_id, action_name) DO NOTHING',
    [superAdminRole.id, '*', 'all']
  );

  return superAdminRole;
}

async function createAdminUser(client, superAdminRole = null) {
  log.info('--- TẠO ADMIN USER ---');
  const adminUsername = await question('Nhập admin username (mặc định: admin): ') || 'admin';
  const adminPassword = await question('Nhập admin password (mặc định: admin): ') || 'admin';

  const { rows: existing } = await client.query('SELECT * FROM sys_users WHERE username = $1', [adminUsername]);
  let adminUser;

  if (existing.length === 0) {
    const { rows } = await client.query(
      'INSERT INTO sys_users (full_name, username, password_hash, is_admin) VALUES ($1,$2,$3,true) RETURNING *',
      ['Super Administrator', adminUsername, await hashPassword(adminPassword)]
    );
    adminUser = rows[0];
    log.info(`Đã tạo mới admin user: ${adminUsername} với toàn quyền (is_admin=true)`);
  } else {
    adminUser = existing[0];
    log.warn(`User '${adminUsername}' đã tồn tại.`);
    const doReset = await question(`[?] Reset password cho '${adminUsername}' và set is_admin=true? (y/N): `);
    if (doReset.toLowerCase() === 'y' || doReset.toLowerCase() === 'yes') {
      const { rows } = await client.query(
        'UPDATE sys_users SET password_hash=$1, is_admin=true, updated_at=NOW() WHERE id=$2 RETURNING *',
        [await hashPassword(adminPassword), adminUser.id]
      );
      adminUser = rows[0];
      log.info(`Đã cập nhật thành công cho user: ${adminUsername}`);
    } else {
      log.info(`Giữ nguyên user: ${adminUsername}`);
    }
  }

  if (superAdminRole) {
    log.info(`Assigning Super Admin role to ${adminUsername}...`);
    await client.query(
      'INSERT INTO sys_user_roles (user_id, role_id) VALUES ($1,$2) ON CONFLICT (user_id, role_id) DO NOTHING',
      [adminUser.id, superAdminRole.id]
    );
  }
}

async function resetPassword(client) {
  log.info('--- RESET PASSWORD GẤP ---');
  const username = await question('Nhập username cần reset: ');
  if (!username) { log.warn('Username không hợp lệ!'); return; }

  const { rows, rowCount } = await client.query('SELECT id FROM sys_users WHERE username = $1', [username]);
  if (rowCount === 0) { log.warn(`Không tìm thấy user '${username}'.`); return; }

  const password = await question(`Nhập password mới cho '${username}': `);
  if (!password) { log.warn('Password không hợp lệ!'); return; }

  await client.query(
    'UPDATE sys_users SET password_hash=$1, updated_at=NOW() WHERE id=$2',
    [await hashPassword(password), rows[0].id]
  );
  log.info(`Đã reset password thành công cho user: ${username}`);
}

async function run() {
  const args = process.argv.slice(2);
  const isOnlyAdmin = args.includes('--admin');
  const isOnlyReset = args.includes('--reset-password');
  const isFullInit = !isOnlyAdmin && !isOnlyReset;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (isFullInit) {
      log.info('--- KHỞI TẠO TOÀN BỘ HỆ THỐNG ---');
      await initSettings(client);
      const superAdminRole = await initSuperRole(client);
      await createAdminUser(client, superAdminRole);
    } else if (isOnlyAdmin) {
      const { rows } = await client.query("SELECT id FROM sys_roles WHERE name = 'Super Admin'");
      await createAdminUser(client, rows[0] ?? null);
    } else if (isOnlyReset) {
      await resetPassword(client);
    }

    await client.query('COMMIT');
    log.info('✅ Thao tác thành công hoàn toàn.');
  } catch (err) {
    await client.query('ROLLBACK');
    log.error(err, '❌ Đã xảy ra lỗi, tất cả thay đổi bị huỷ (Rollback)');
  } finally {
    client.release();
    rl.close();
    await pool.end();
  }
}

run();
