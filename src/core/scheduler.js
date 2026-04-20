import cron from 'node-cron';
import { pool } from './db.js';
import { generateTraceId, requestContext } from './request-context.js';
import { createLogger } from './logger.js';
import { hooks } from './hooks.js';

const log = createLogger('scheduler');

// Simple singleton lock for scheduler using database
// Use a generic hashing for lock names to avoid hardcoded IDs
async function acquireLock(lockName) {
  try {
    // Generate a 32-bit integer lock id from the string lockName
    let hash = 0;
    for (let i = 0; i < lockName.length; i++) {
        const char = lockName.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    const lockId = Math.abs(hash); // PostgreSQL pg_try_advisory_lock accepts INT/BIGINT
    
    const { rows } = await pool.query('SELECT pg_try_advisory_lock($1) as got_lock', [lockId]);
    return rows[0].got_lock;
  } catch (e) {
    log.error({ err: e }, `Failed to acquire lock for ${lockName}`);
    return false;
  }
}

async function releaseLock(lockName) {
  try {
    let hash = 0;
    for (let i = 0; i < lockName.length; i++) {
        const char = lockName.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    const lockId = Math.abs(hash);
    
    await pool.query('SELECT pg_advisory_unlock($1)', [lockId]);
  } catch (e) {
    log.error({ err: e }, `Failed to release lock for ${lockName}`);
  }
}

export async function executeJob(jobName, logicFn) {
  const traceId = generateTraceId();
  return await requestContext.run({ traceId }, async () => {
    const gotLock = await acquireLock(jobName);
    if (!gotLock) {
      log.info(`Skipped ${jobName} (lock busy)`);
      return { skipped: true, reason: 'lock busy' };
    }

    const start = Date.now();
    let logId = null;

    try {
      const { rows } = await pool.query(
        'INSERT INTO sys_cronjob_logs (job_name, status) VALUES ($1, $2) RETURNING id',
        [jobName, 'RUNNING']
      );
      logId = rows[0].id;

      log.info(`Running ${jobName} job...`);
      const resultDetails = await logicFn();

      const duration = Date.now() - start;
      await pool.query(
        'UPDATE sys_cronjob_logs SET status = $1, completed_at = NOW(), duration_ms = $2, result_details = $3 WHERE id = $4',
        ['SUCCESS', duration, JSON.stringify(resultDetails || {}), logId]
      );
      log.info(`Completed ${jobName} job successfully in ${duration}ms`);
      return resultDetails;
    } catch (err) {
      log.error({ err }, `Error in ${jobName} job`);
      const duration = Date.now() - start;
      if (logId) {
        await pool.query(
          'UPDATE sys_cronjob_logs SET status = $1, completed_at = NOW(), duration_ms = $2, error_message = $3 WHERE id = $4',
          ['FAILED', duration, err.message || String(err), logId]
        );
        
        try {
          const { NotificationService } = await import('../modules/system/backend/services/NotificationService.js');
          const adminQuery = await pool.query('SELECT id FROM sys_users WHERE is_admin = true AND is_active = true');
          for (const admin of adminQuery.rows) {
            await NotificationService.sendNotification({
              targetId: admin.id,
              title: `Cronjob Failed: ${jobName}`,
              message: `Tiến trình chạy ngầm ${jobName} đã gặp lỗi: ${err.message || String(err)}`,
              type: 'ERROR',
              link: '/system/cronjobs'
            });
          }
        } catch(notifErr) {
          log.error({ err: notifErr }, 'Failed to send cronjob failure notification');
        }
      }
      throw err;
    } finally {
      await releaseLock(jobName);
    }
  });
}

// Memory cache for registered schedules
export const CROBJOB_SCHEDULES = [];

export async function reloadCronSchedules() {
  const schedules = await hooks.applyFilters('system.cronjobs', []);
  CROBJOB_SCHEDULES.length = 0;
  CROBJOB_SCHEDULES.push(...schedules);
  return CROBJOB_SCHEDULES;
}

export async function initScheduler() {
  log.info('Initializing Node-cron scheduler...');
  const schedules = await reloadCronSchedules();
  for (const job of schedules) {
    cron.schedule(job.cron, job.fn);
  }
}
