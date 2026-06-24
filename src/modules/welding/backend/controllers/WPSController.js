import { paginate } from '../../../../core/db.js';
import { wpsRepo, pqrRepo } from '../repositories/WeldingRepository.js';
import { AppError } from '../../../../core/errors.js';

export class WPSController {
  static async getAll(req, res) {
    const { limit, offset, page } = paginate(req);
    const filter = {};
    if (req.query.projectId) filter.project_id = req.query.projectId;
    if (req.query.status)    filter.status     = req.query.status;
    const { data, meta } = await wpsRepo.findAndCount(filter, { limit, offset, page, orderBy: 'created_at DESC' });
    res.json({ data, pagination: { page, limit, total: meta.total, totalPages: meta.totalPages } });
  }

  static async getOne(req, res) {
    const record = await wpsRepo.findWithPqr(req.params.id);
    if (!record) throw new AppError(404, 'Không tìm thấy WPS');
    res.json({ data: record });
  }

  static async create(req, res) {
    const body = req.validated ?? req.body;
    const record = await wpsRepo.create({
      wps_no: body.wps_no,
      project_id: body.project_id ?? null,
      process: body.process ?? null,
      base_metal: body.base_metal ?? null,
      position: body.position ?? null,
      thickness_range: body.thickness_range ?? null,
      status: body.status ?? 'DRAFT',
    });
    res.status(201).json({ data: record });
  }

  static async update(req, res) {
    const existing = await wpsRepo.findOne(req.params.id);
    if (!existing) throw new AppError(404, 'Không tìm thấy WPS');
    const record = await wpsRepo.update(req.params.id, req.validated ?? req.body);
    res.json({ data: record });
  }

  static async approve(req, res) {
    const existing = await wpsRepo.findOne(req.params.id);
    if (!existing) throw new AppError(404, 'Không tìm thấy WPS');
    const record = await wpsRepo.update(req.params.id, {
      status: 'APPROVED',
      approved_by: req.user?.id ?? null,
    });
    res.json({ data: record });
  }

  static async addPqr(req, res) {
    const wps = await wpsRepo.findOne(req.params.id);
    if (!wps) throw new AppError(404, 'Không tìm thấy WPS');
    const body = req.validated ?? req.body;
    const record = await pqrRepo.create({
      pqr_no: body.pqr_no,
      wps_id: req.params.id,
      test_result: body.test_result ?? 'PASS',
    });
    res.status(201).json({ data: record });
  }
}
