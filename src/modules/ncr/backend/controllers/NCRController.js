import { paginate } from '../../../../core/db.js';
import { ncrRepo } from '../repositories/NCRRepository.js';
import { NCRWorkflowService } from '../services/NCRWorkflowService.js';
import { AppError } from '../../../../core/errors.js';

export class NCRController {
  static async getAll(req, res) {
    const { limit, offset, page } = paginate(req);
    const filter = {};
    if (req.query.status)    filter.status     = req.query.status;
    if (req.query.projectId) filter.project_id = req.query.projectId;
    if (req.query.severity)  filter.severity   = req.query.severity;
    if (req.query.slaStatus) filter.sla_status = req.query.slaStatus;
    const { data, meta } = await ncrRepo.findAndCountList(filter, { limit, offset });
    res.json({ data, pagination: { page, limit, total: meta.total, totalPages: meta.totalPages } });
  }

  static async getOne(req, res) {
    const record = await ncrRepo.findDetail(req.params.id);
    if (!record) throw new AppError(404, 'Không tìm thấy NCR');
    res.json({ data: record });
  }

  static async create(req, res) {
    const data = req.validated ?? req.body;
    const record = await NCRWorkflowService.create(data, req.user?.id ?? null);
    res.status(201).json({ data: record });
  }

  static async transition(req, res) {
    const { to_status, note, assigned_to, root_cause_category } = req.validated ?? req.body;
    const record = await NCRWorkflowService.transition(
      req.params.id, to_status, req.user?.id ?? null,
      { note, assigned_to, root_cause_category }
    );
    res.json({ data: record });
  }

  static async assign(req, res) {
    const { assigned_to, due_date, note } = req.validated ?? req.body;
    const record = await NCRWorkflowService.assign(
      req.params.id, assigned_to, due_date, req.user?.id ?? null, note
    );
    res.json({ data: record });
  }

  static async addAction(req, res) {
    const payload = req.validated ?? req.body;
    const action = await NCRWorkflowService.addAction(req.params.id, payload, req.user?.id ?? null);
    res.status(201).json({ data: action });
  }

  static async verifyAction(req, res) {
    const { status, note } = req.validated ?? req.body;
    const action = await NCRWorkflowService.verifyAction(
      req.params.id, req.params.actionId, status, req.user?.id ?? null, note
    );
    res.json({ data: action });
  }

  static async close(req, res) {
    const { note } = req.validated ?? req.body;
    const record = await NCRWorkflowService.close(req.params.id, req.user?.id ?? null, note);
    res.json({ data: record });
  }
}
