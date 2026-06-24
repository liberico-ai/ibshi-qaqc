import { paginate } from '../../../../core/db.js';
import { ndtRequestRepo } from '../repositories/NDTRepository.js';
import { NDTRequestService } from '../services/NDTRequestService.js';
import { AppError } from '../../../../core/errors.js';

export class NDTRequestController {
  static async getAll(req, res) {
    const { limit, offset, page } = paginate(req);
    const filter = {};
    if (req.query.projectId) filter.project_id = req.query.projectId;
    if (req.query.status)    filter.status     = req.query.status;
    if (req.query.method)    filter.method     = req.query.method;
    if (req.query.vendorId)  filter.vendor_id  = req.query.vendorId;
    const { data, meta } = await ndtRequestRepo.listWithVendor(filter, { limit, offset, page });
    res.json({ data, pagination: { page, limit, total: meta.total, totalPages: meta.totalPages } });
  }

  static async getOne(req, res) {
    const record = await ndtRequestRepo.findDetail(req.params.id);
    if (!record) throw new AppError(404, 'Không tìm thấy yêu cầu NDT');
    res.json({ data: record });
  }

  static async create(req, res) {
    const body = req.validated ?? req.body;
    const record = await NDTRequestService.createAndNotify(body, req.user?.id);
    res.status(201).json({ data: record });
  }

  static async updateStatus(req, res) {
    const { status } = req.validated ?? req.body;
    const record = await NDTRequestService.updateStatus(req.params.id, status);
    res.json({ data: record });
  }

  static async uploadResult(req, res) {
    const body = req.validated ?? req.body;
    const record = await NDTRequestService.uploadResult(req.params.id, body, req.user?.id);
    res.status(201).json({ data: record });
  }
}
