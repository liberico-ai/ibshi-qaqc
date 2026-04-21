import { paginate, pool } from '../../../../core/db.js';
import { inspectionRepo } from '../repositories/InspectionRepository.js';
import { InspectionService } from '../services/InspectionService.js';
import { AppError } from '../../../../core/errors.js';
import { auditLog } from '../../../../core/audit-log.js';

export class InspectionController {
  static async getAll(req, res) {
    const { limit, offset, page } = paginate(req);
    const filter = {};
    if (req.query.assignedTo) filter.assigned_to = req.query.assignedTo;
    if (req.query.projectId)  filter.project_id  = req.query.projectId;
    if (req.query.status)     filter.status       = req.query.status;
    const { data, meta } = await inspectionRepo.findAndCount(filter, { limit, offset, orderBy: 'created_at DESC' });
    res.json({ data, pagination: { page, limit, total: meta.total, totalPages: meta.totalPages } });
  }

  static async getOne(req, res) {
    const record = await inspectionRepo.findWithResults(req.params.id);
    if (!record) throw new AppError(404, 'Inspection not found');
    res.json({ data: record });
  }

  static async create(req, res) {
    const { plan_id, item_id, project_id, unit_id, ip_code, assigned_to } = req.body;
    const record = await inspectionRepo.create({ plan_id, item_id, project_id, unit_id, ip_code, assigned_to, status: 'PENDING' });
    res.status(201).json({ data: record });
  }

  static async saveResults(req, res) {
    const existing = await inspectionRepo.findOne(req.params.id);
    if (!existing) throw new AppError(404, 'Inspection not found');
    await inspectionRepo.saveResults(req.params.id, req.body.results ?? []);
    await InspectionService.transition(req.params.id, 'IN_PROGRESS');

    const offlineSynced = req.headers['x-offline-sync'] === 'true';
    const clientTimestamp = req.headers['x-client-timestamp'] ?? null;
    auditLog.log({
      action: 'update',
      tableName: 'qaqc_inspections',
      entityId: req.params.id,
      newData: { results_count: (req.body.results ?? []).length },
      offlineSynced,
      clientTimestamp,
    });

    res.json({ data: await inspectionRepo.findWithResults(req.params.id) });
  }

  static async sign(req, res) {
    const record = await InspectionService.sign(req.params.id, req.user?.id, req.body.pin);
    res.json({ data: record });
  }

  static async uploadPhoto(req, res) {
    const { file_url, result_id, taken_at } = req.body;
    if (!file_url) throw new AppError(400, 'file_url required');
    const { rows } = await pool.query(
      'INSERT INTO qaqc_inspection_photos (inspection_id,result_id,file_url,taken_at) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.params.id, result_id ?? null, file_url, taken_at ?? null]
    );
    res.status(201).json({ data: rows[0] });
  }

  static async escalate(req, res) {
    const existing = await inspectionRepo.findOne(req.params.id);
    if (!existing) throw new AppError(404, 'Inspection not found');
    await pool.query('UPDATE qaqc_inspections SET status=$1, updated_at=now() WHERE id=$2', ['FAILED', req.params.id]);
    res.json({ message: 'Escalated to NCR', data: await inspectionRepo.findOne(req.params.id) });
  }

  static async getDashboard(req, res) {
    const data = await inspectionRepo.getDashboard();
    res.json({ data });
  }
}
