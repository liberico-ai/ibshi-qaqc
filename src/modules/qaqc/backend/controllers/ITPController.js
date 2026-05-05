import { paginate } from '../../../../core/db.js';
import { itpRepo } from '../repositories/ITPRepository.js';
import { ITPWorkflowService } from '../services/ITPWorkflowService.js';
import { AppError } from '../../../../core/errors.js';
import { HoldPointService } from '../services/HoldPointService.js';

export class ITPController {
  static async getAll(req, res) {
    const { limit, offset, page } = paginate(req);
    const filter = {};
    if (req.query.projectId) filter.project_id = req.query.projectId;
    if (req.query.status)    filter.status      = req.query.status;
    const { data, meta } = await itpRepo.findAndCount(filter, { limit, offset, orderBy: 'created_at DESC' });
    res.json({ data, pagination: { page, limit, total: meta.total, totalPages: meta.totalPages } });
  }

  static async getOne(req, res) {
    const record = await itpRepo.findWithItems(req.params.id);
    if (!record) throw new AppError(404, 'ITP not found');
    res.json({ data: record });
  }

  static async create(req, res) {
    const body = req.validated ?? req.body;
    const { plan: planBody, items, project_id, product_type } = body;
    const plan = planBody ?? { project_id, product_type };
    if (!plan.project_id) throw new AppError(400, 'project_id required');
    plan.created_by = req.user?.id;
    const record = await itpRepo.createWithItems({ plan, items: items ?? [] });
    res.status(201).json({ data: record });
  }

  static async update(req, res) {
    const existing = await itpRepo.findOne(req.params.id);
    if (!existing) throw new AppError(404, 'ITP not found');
    if (existing.status !== 'DRAFT') throw new AppError(400, 'Only DRAFT plans can be edited');
    const record = await itpRepo.update(req.params.id, req.validated ?? req.body);
    res.json({ data: record });
  }

  static async submit(req, res) {
    const record = await ITPWorkflowService.transition(req.params.id, 'UNDER_REVIEW', req.user?.id);
    res.json({ data: record });
  }

  static async approve(req, res) {
    const { targetStatus } = req.validated ?? req.body;
    const record = await ITPWorkflowService.transition(req.params.id, targetStatus, req.user?.id);
    res.json({ data: record });
  }

  static async activate(req, res) {
    const record = await ITPWorkflowService.transition(req.params.id, 'ACTIVE', req.user?.id);
    res.json({ data: record });
  }

  static async copy(req, res) {
    const { targetProjectId } = req.validated ?? req.body;
    if (!targetProjectId) throw new AppError(400, 'targetProjectId required');
    const record = await ITPWorkflowService.copyPlan(req.params.id, targetProjectId, req.user?.id);
    res.status(201).json({ data: record });
  }

  static async addItem(req, res) {
    const plan = await itpRepo.findOne(req.params.id);
    if (!plan) throw new AppError(404, 'ITP not found');
    if (plan.status !== 'DRAFT') throw new AppError(400, 'Only DRAFT plans can be edited');
    const item = await itpRepo.addItem(req.params.id, req.validated ?? req.body);
    res.status(201).json({ data: item });
  }

  static async removeItem(req, res) {
    const plan = await itpRepo.findOne(req.params.id);
    if (!plan) throw new AppError(404, 'ITP not found');
    if (plan.status !== 'DRAFT') throw new AppError(400, 'Only DRAFT plans can be edited');
    await itpRepo.removeItem(req.params.itemId);
    res.json({ ok: true });
  }

  static async getHoldStatus(req, res) {
    const status = await HoldPointService.getHoldStatus(req.params.planId);
    res.json({ data: status });
  }

  static async getPendingHolds(req, res) {
    const items = await HoldPointService.getPendingHoldPoints(req.query.projectId ?? null);
    res.json({ data: items });
  }

  static async releaseHoldPoint(req, res) {
    const { comment } = req.validated ?? req.body;
    const release = await HoldPointService.releaseHoldPoint(req.params.itemId, {
      userId: req.user.id,
      comment,
    });
    res.status(201).json({ data: release });
  }

  static async overrideHoldPoint(req, res) {
    const { reason } = req.validated ?? req.body;
    await HoldPointService.overrideHoldPoint(req.params.itemId, {
      userId: req.user.id,
      reason,
    });
    res.json({ ok: true });
  }

  static async getTemplates(req, res) {
    const { product_type } = req.query;
    const filter = { status: 'ACTIVE' };
    if (product_type) filter.product_type = product_type;
    const records = await itpRepo.find(filter, { orderBy: 'product_type ASC' });
    res.json({ data: records });
  }
}
