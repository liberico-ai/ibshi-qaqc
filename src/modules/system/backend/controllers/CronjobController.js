import { CROBJOB_SCHEDULES } from '../../../../core/scheduler.js';
import { AppError } from '../../../../core/errors.js';
import { cronjobLogsRepo } from '../repositories/CronjobLogsRepository.js';
import * as cronParserPkg from 'cron-parser';

export class CronjobController {

  static async getCronjobs(req, res) {
    const jobs = [];

    for (const schedule of CROBJOB_SCHEDULES) {
      const lastRun = await cronjobLogsRepo.findLatestRun(schedule.name);
      let nextRun = null;
      try {
        const interval = cronParserPkg.CronExpressionParser.parse(schedule.cron);
        nextRun = interval.next().toISOString();
      } catch (e) {
        console.error('Error parsing cron:', e.message);
      }
      jobs.push({
        name: schedule.name,
        cron: schedule.cron,
        description: schedule.description,
        last_run: lastRun,
        next_run: nextRun,
      });
    }

    res.json(jobs);
  }

  static async getJobHistory(req, res) {
    const { jobName } = req.params;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const { rows, total } = await cronjobLogsRepo.findHistoryByJob(jobName, { limit, offset });

    res.json({
      data: rows,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    });
  }

  static async manuallyRunJob(req, res) {
    const { jobName } = req.params;
    const schedule = CROBJOB_SCHEDULES.find(s => s.name === jobName);
    if (!schedule) throw new AppError(404, 'Job not found');

    schedule.fn().catch(err => {
      console.error(`Manual run of ${jobName} failed:`, err);
    });

    res.json({ message: `Job ${jobName} started manually in the background.` });
  }
}
