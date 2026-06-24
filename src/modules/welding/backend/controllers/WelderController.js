import { paginate } from '../../../../core/db.js';
import { welderRepo } from '../repositories/WeldingRepository.js';
import { WelderQualService } from '../services/WelderQualService.js';
import { AppError } from '../../../../core/errors.js';

export class WelderController {
  static async getAll(req, res) {
    const { limit, offset, page } = paginate(req);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const { data, meta } = await welderRepo.findAndCount(filter, { limit, offset, page, orderBy: 'welder_code ASC' });

    // Gắn trạng thái chứng chỉ cho mỗi thợ hàn
    const enriched = await Promise.all(data.map(async (w) => ({
      ...w,
      cert: await WelderQualService.getCertStatus(w.id),
    })));

    res.json({ data: enriched, pagination: { page, limit, total: meta.total, totalPages: meta.totalPages } });
  }

  static async getOne(req, res) {
    const record = await welderRepo.findWithQuals(req.params.id);
    if (!record) throw new AppError(404, 'Không tìm thấy thợ hàn');
    const cert = await WelderQualService.getCertStatus(req.params.id);
    res.json({ data: { ...record, cert } });
  }

  static async create(req, res) {
    const body = req.validated ?? req.body;
    const record = await welderRepo.create({
      welder_code: body.welder_code,
      full_name: body.full_name,
      stamp_no: body.stamp_no ?? null,
      status: body.status ?? 'ACTIVE',
    });
    res.status(201).json({ data: record });
  }

  static async update(req, res) {
    const existing = await welderRepo.findOne(req.params.id);
    if (!existing) throw new AppError(404, 'Không tìm thấy thợ hàn');
    const record = await welderRepo.update(req.params.id, req.validated ?? req.body);
    res.json({ data: record });
  }

  static async addQual(req, res) {
    const welder = await welderRepo.findOne(req.params.id);
    if (!welder) throw new AppError(404, 'Không tìm thấy thợ hàn');
    const body = req.validated ?? req.body;
    const record = await welderRepo.addQual({ welder_id: req.params.id, ...body });
    res.status(201).json({ data: record });
  }

  // Thẻ chứng nhận thợ hàn (Welder Qualification Card) — dữ liệu để in
  static async qualificationCard(req, res) {
    const record = await welderRepo.findWithQuals(req.params.id);
    if (!record) throw new AppError(404, 'Không tìm thấy thợ hàn');
    const cert = await WelderQualService.getCertStatus(req.params.id);
    res.json({ data: { ...record, cert } });
  }
}
