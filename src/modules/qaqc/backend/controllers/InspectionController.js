import { paginate, pool } from '../../../../core/db.js';
import { inspectionRepo } from '../repositories/InspectionRepository.js';
import { InspectionService } from '../services/InspectionService.js';
import { InspectionRevisionService } from '../services/InspectionRevisionService.js';
import { AppError } from '../../../../core/errors.js';
import { auditLog } from '../../../../core/audit-log.js';
import { hooks } from '../../../../core/hooks.js';
import { createLogger } from '../../../../core/logger.js';

const log = createLogger('inspection-controller');

export class InspectionController {
  static async getAll(req, res) {
    const { limit, offset, page } = paginate(req);
    const filter = { is_current: true };
    if (req.query.assignedTo) filter.assigned_to = req.query.assignedTo;
    if (req.query.projectId)  filter.project_id  = req.query.projectId;
    if (req.query.status)     filter.status       = req.query.status;
    const { data, meta } = await inspectionRepo.findAndCount(filter, { limit, offset, orderBy: 'created_at DESC' });
    res.json({ data, pagination: { page, limit, total: meta.total, totalPages: meta.totalPages } });
  }

  static async createRevision(req, res) {
    const { reason, ...updatedData } = req.body;
    const result = await InspectionRevisionService.createRevision(req.params.id, {
      userId: req.user?.id,
      reason,
      updatedData,
    });
    res.status(201).json({ data: result });
  }

  static async listRevisions(req, res) {
    const result = await InspectionRevisionService.getRevisionHistory(req.params.id);
    res.json({ data: result });
  }

  static async diffRevisions(req, res) {
    const diff = await InspectionRevisionService.getDiff(req.params.fromId, req.params.toId);
    res.json({ data: diff });
  }

  static async getOne(req, res) {
    const record = await inspectionRepo.findWithResults(req.params.id);
    if (!record) throw new AppError(404, 'Inspection not found');
    res.json({ data: record });
  }

  /**
   * Tạo phiếu nghiệm thu (Inspection / IP).
   *
   * ─── HỢP ĐỒNG HOOK (các agent khác build dựa trên đúng tên + payload này) ───
   *
   * 1) FILTER  `qaqc.inspection.preCreate`  — chạy TRƯỚC khi insert.
   *    Chữ ký: (payload, req) => payload
   *    payload shape (object, có thể bị handler chỉnh sửa rồi trả lại):
   *      {
   *        ip_code, project_id, plan_id, item_id, unit_id, assigned_to,
   *        device_id, weld_joint_ref,        // tuỳ chọn (mối hàn / thiết bị đo)
   *        ...req.body                        // các trường khác từ request
   *      }
   *    Handler CÓ THỂ ném AppError để CHẶN việc tạo phiếu — lỗi sẽ lan ra
   *    asyncHandler và trả về cho client (không bị nuốt).
   *
   * 2) ACTION  `qaqc.inspection.created`  — chạy SAU khi insert thành công.
   *    Chữ ký: (record) => void
   *    record = bản ghi inspection vừa tạo (gồm id, status='PENDING', ...).
   *    Dùng để các handler downstream (vd: tạo yêu cầu NDT) phản ứng. Lời gọi
   *    được bọc try/catch + log ở đây để 1 handler downstream lỗi KHÔNG làm hỏng
   *    việc tạo phiếu nghiệm thu.
   * ───────────────────────────────────────────────────────────────────────────
   */
  static async create(req, res) {
    const body = req.validated ?? req.body;
    const { plan_id, item_id, project_id, unit_id, ip_code, assigned_to, device_id, weld_joint_ref } = body;

    // FILTER trước khi insert — handler có thể chỉnh payload hoặc ném AppError để chặn.
    const payload = await hooks.applyFilters(
      'qaqc.inspection.preCreate',
      { ip_code, project_id, plan_id, item_id, unit_id, assigned_to, device_id, weld_joint_ref, ...body },
      req
    );

    const record = await inspectionRepo.create({
      plan_id: payload.plan_id,
      item_id: payload.item_id,
      project_id: payload.project_id,
      unit_id: payload.unit_id,
      ip_code: payload.ip_code,
      assigned_to: payload.assigned_to,
      device_id: payload.device_id ?? null,
      weld_joint_ref: payload.weld_joint_ref ?? null,
      status: 'PENDING',
    });

    // ACTION sau khi insert — non-blocking: lỗi downstream không làm hỏng tạo phiếu.
    try {
      await hooks.doAction('qaqc.inspection.created', record);
    } catch (err) {
      log.error(err, 'qaqc.inspection.created hook failed — inspection still created');
    }

    res.status(201).json({ data: record });
  }

  static async saveResults(req, res) {
    const existing = await inspectionRepo.findOne(req.params.id);
    if (!existing) throw new AppError(404, 'Inspection not found');
    const body = req.validated ?? req.body;
    await inspectionRepo.saveResults(req.params.id, body.results ?? []);
    await InspectionService.transition(req.params.id, 'IN_PROGRESS');

    const offlineSynced = req.headers['x-offline-sync'] === 'true';
    const clientTimestamp = req.headers['x-client-timestamp'] ?? null;
    auditLog.log({
      action: 'update',
      tableName: 'qaqc_inspections',
      entityId: req.params.id,
      newData: { results_count: (body.results ?? []).length },
      offlineSynced,
      clientTimestamp,
    });

    res.json({ data: await inspectionRepo.findWithResults(req.params.id) });
  }

  static async sign(req, res) {
    const record = await InspectionService.sign(req.params.id, req.user?.id, (req.validated ?? req.body).pin);
    res.json({ data: record });
  }

  static async uploadPhoto(req, res) {
    const { file_url, result_id, taken_at } = req.validated ?? req.body;
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
