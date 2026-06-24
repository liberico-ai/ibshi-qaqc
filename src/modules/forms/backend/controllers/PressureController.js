import { paginate } from '../../../../core/db.js';
import { pressureRepo } from '../repositories/FormsRepository.js';
import { AppError } from '../../../../core/errors.js';

export class PressureController {
  static async getAll(req, res) {
    const { limit, offset, page } = paginate(req);
    const filter = {};
    if (req.query.projectId) filter.project_id = req.query.projectId;
    if (req.query.medium)    filter.medium      = req.query.medium;
    if (req.query.result)    filter.result      = req.query.result;
    const { data, meta } = await pressureRepo.findAndCount(filter, { limit, offset, page, orderBy: 'created_at DESC' });
    res.json({ data, pagination: { page, limit, total: meta.total, totalPages: meta.totalPages } });
  }

  static async getOne(req, res) {
    const record = await pressureRepo.findOne(req.params.id);
    if (!record) throw new AppError(404, 'Không tìm thấy chứng chỉ thử áp lực');
    res.json({ data: record });
  }

  static async create(req, res) {
    const body = req.validated ?? req.body;
    const record = await pressureRepo.create({
      project_id: body.project_id ?? null,
      test_no: body.test_no,
      medium: body.medium ?? 'hydro',
      pressure_value: body.pressure_value ?? null,
      hold_time: body.hold_time ?? null,
      result: body.result ?? null,
      certificate_no: body.certificate_no ?? null,
      tested_at: body.tested_at ?? null,
      note: body.note ?? null,
    });
    res.status(201).json({ data: record });
  }
}
