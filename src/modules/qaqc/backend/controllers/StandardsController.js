import { paginate } from '../../../../core/db.js';
import { standardsRepo } from '../repositories/StandardsRepository.js';
import { StandardsSearchService } from '../services/StandardsSearchService.js';
import { AppError } from '../../../../core/errors.js';

export class StandardsController {
  static async getAll(req, res) {
    const { limit, offset, page } = paginate(req);
    const { q, grp, tier, status = 'ACTIVE' } = req.query;
    const { data, total } = await StandardsSearchService.search({ query: q, grp, tier, status, limit, offset });
    const totalPages = Math.ceil(total / limit);
    res.json({ data, pagination: { page, limit, total, totalPages } });
  }

  static async getOne(req, res) {
    const record = await standardsRepo.getWithSpecs(req.params.id);
    if (!record) throw new AppError(404, 'Standard not found');
    res.json({ data: record });
  }

  static async create(req, res) {
    const { standard, specs } = req.validated ?? req.body;
    const record = await standardsRepo.createWithSpecs({ standard, specs });
    res.status(201).json({ data: record });
  }

  static async update(req, res) {
    const existing = await standardsRepo.findOne(req.params.id);
    if (!existing) throw new AppError(404, 'Standard not found');
    const record = await standardsRepo.update(req.params.id, req.validated ?? req.body);
    res.json({ data: record });
  }

  static async search(req, res) {
    const { query, filters = {} } = req.validated ?? req.body;
    const { data, total } = await StandardsSearchService.search({ query, ...filters });
    res.json({ data, total });
  }

  static async deprecate(req, res) {
    const existing = await standardsRepo.findOne(req.params.id);
    if (!existing) throw new AppError(404, 'Standard not found');
    const record = await standardsRepo.update(req.params.id, { status: 'DEPRECATED' });
    res.json({ data: record });
  }

  static async getSpecs(req, res) {
    const record = await standardsRepo.getWithSpecs(req.params.id);
    if (!record) throw new AppError(404, 'Standard not found');
    res.json({ data: record.specs });
  }
}
