import { paginate } from '../../../../core/db.js';
import { AppError } from '../../../../core/errors.js';
import { sysLogsRepo } from '../repositories/SysLogsRepository.js';

export class SysLogsController {

  static async getLogs(req, res) {
    const { limit, offset, page } = paginate(req, { defaultLimit: 50, maxLimit: 200 });
    const { keyword, action, entity_table, user_id, from, to } = req.query;

    const { rows, total } = await sysLogsRepo.findFiltered({
      keyword, action, entity_table, user_id, from, to, limit, offset,
    });

    res.json({
      data: rows,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
    });
  }

  static async getLogDetail(req, res) {
    const log = await sysLogsRepo.findOne(req.params.id);
    if (!log) throw new AppError(404, 'Log entry không tồn tại');
    res.json(log);
  }

  static async getStats(_req, res) {
    const rows = await sysLogsRepo.statsLast7Days();
    res.json(rows);
  }
}
