import { paginate } from '../../../../core/db.js';
import { ndtVendorRepo } from '../repositories/NDTRepository.js';
import { AppError } from '../../../../core/errors.js';

export class NDTVendorController {
  static async getAll(req, res) {
    const { limit, offset, page } = paginate(req);
    const filter = {};
    if (req.query.approved === 'true')  filter.is_approved = true;
    if (req.query.approved === 'false') filter.is_approved = false;
    const { data, meta } = await ndtVendorRepo.findAndCount(filter, { limit, offset, page, orderBy: 'name ASC' });
    res.json({ data, pagination: { page, limit, total: meta.total, totalPages: meta.totalPages } });
  }

  static async getOne(req, res) {
    const record = await ndtVendorRepo.findOne(req.params.id);
    if (!record) throw new AppError(404, 'Không tìm thấy nhà thầu NDT');
    res.json({ data: record });
  }

  static async create(req, res) {
    const body = req.validated ?? req.body;
    const record = await ndtVendorRepo.create({
      name: body.name,
      contact_email: body.contact_email ?? null,
      is_approved: body.is_approved ?? false,
    });
    res.status(201).json({ data: record });
  }

  static async update(req, res) {
    const existing = await ndtVendorRepo.findOne(req.params.id);
    if (!existing) throw new AppError(404, 'Không tìm thấy nhà thầu NDT');
    const record = await ndtVendorRepo.update(req.params.id, req.validated ?? req.body);
    res.json({ data: record });
  }
}
