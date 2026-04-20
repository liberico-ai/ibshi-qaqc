import { Repository } from '../../../../core/db.js';

class CronjobLogsRepository extends Repository {
  constructor() {
    // sys_cronjob_logs trong SKIP_TABLES audit
    super('sys_cronjob_logs');
  }

  async findLatestRun(jobName) {
    const { rows } = await this.query(
      `SELECT status, started_at, completed_at, duration_ms, error_message
       FROM sys_cronjob_logs WHERE job_name = $1 ORDER BY started_at DESC LIMIT 1`,
      [jobName]
    );
    return rows[0] ?? null;
  }

  async findHistoryByJob(jobName, { limit, offset }) {
    const countRes = await this.query(
      'SELECT COUNT(*)::int AS total FROM sys_cronjob_logs WHERE job_name = $1',
      [jobName]
    );
    const total = countRes.rows[0].total;

    const { rows } = await this.query(
      `SELECT id, job_name, status, started_at, completed_at, duration_ms, result_details, error_message
       FROM sys_cronjob_logs WHERE job_name = $1
       ORDER BY started_at DESC LIMIT $2 OFFSET $3`,
      [jobName, limit, offset]
    );
    return { rows, total };
  }
}

export const cronjobLogsRepo = new CronjobLogsRepository();
