import { paginate } from '../../../../core/db.js';
import { paintingRepo } from '../repositories/FormsRepository.js';
import { AppError } from '../../../../core/errors.js';

export class PaintingController {
  static async getAll(req, res) {
    const { limit, offset, page } = paginate(req);
    const filter = {};
    if (req.query.projectId) filter.project_id = req.query.projectId;
    if (req.query.result)    filter.result      = req.query.result;
    const { data, meta } = await paintingRepo.findAndCount(filter, { limit, offset, page, orderBy: 'created_at DESC' });
    res.json({ data, pagination: { page, limit, total: meta.total, totalPages: meta.totalPages } });
  }

  static async getOne(req, res) {
    const record = await paintingRepo.findOne(req.params.id);
    if (!record) throw new AppError(404, 'Không tìm thấy bản ghi sơn/DFT');
    res.json({ data: record });
  }

  static async create(req, res) {
    const body = req.validated ?? req.body;
    // Kiểm tra ngưỡng DFT → tự tính result (PASS/FAIL)
    const result = PaintingController._evaluate(body.dft_reading, body.dft_min, body.dft_max);
    const record = await paintingRepo.create({
      project_id: body.project_id ?? null,
      area: body.area ?? null,
      dft_reading: body.dft_reading ?? null,
      dft_min: body.dft_min ?? null,
      dft_max: body.dft_max ?? null,
      surface_prep: body.surface_prep ?? null,
      result,
      inspected_by: req.user?.id ?? null,
      inspected_at: body.inspected_at ?? null,
      note: body.note ?? null,
    });
    res.status(201).json({ data: record });
  }

  /** PASS nếu dft_reading nằm trong [min, max] (bỏ qua ngưỡng không khai báo). */
  static _evaluate(reading, min, max) {
    if (reading == null) return null;
    if (min != null && Number(reading) < Number(min)) return 'FAIL';
    if (max != null && Number(reading) > Number(max)) return 'FAIL';
    return 'PASS';
  }
}
