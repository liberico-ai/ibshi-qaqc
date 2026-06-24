import { paginate, pool } from '../../../../core/db.js';
import { rfiRepo } from '../repositories/FormsRepository.js';
import { AppError } from '../../../../core/errors.js';
import { NotificationService } from '../../../system/backend/services/NotificationService.js';

export class RfiController {
  static async getAll(req, res) {
    const { limit, offset, page } = paginate(req);
    const filter = {};
    if (req.query.projectId) filter.project_id = req.query.projectId;
    if (req.query.type)      filter.type        = req.query.type;
    if (req.query.status)    filter.status      = req.query.status;
    const { data, meta } = await rfiRepo.findAndCount(filter, { limit, offset, page, orderBy: 'created_at DESC' });
    res.json({ data, pagination: { page, limit, total: meta.total, totalPages: meta.totalPages } });
  }

  static async getOne(req, res) {
    const record = await rfiRepo.findOne(req.params.id);
    if (!record) throw new AppError(404, 'Không tìm thấy RFI');
    res.json({ data: record });
  }

  static async create(req, res) {
    const body = req.validated ?? req.body;
    const record = await rfiRepo.create({
      rfi_no: body.rfi_no,
      project_id: body.project_id ?? null,
      type: body.type ?? 'internal',
      inspection_point: body.inspection_point ?? null,
      requested_by: req.user?.id ?? null,
      assigned_to: body.assigned_to ?? null,
      status: 'OPEN',
      scheduled_at: body.scheduled_at ?? null,
      note: body.note ?? null,
    });

    // Đẩy thông báo tới QC (người được giao + người có quyền forms.rfi.write)
    await RfiController._notifyQc(record);

    res.status(201).json({ data: record });
  }

  static async update(req, res) {
    const existing = await rfiRepo.findOne(req.params.id);
    if (!existing) throw new AppError(404, 'Không tìm thấy RFI');
    const record = await rfiRepo.update(req.params.id, req.validated ?? req.body);
    res.json({ data: record });
  }

  static async _notifyQc(rfi) {
    try {
      const ids = new Set();
      if (rfi.assigned_to) ids.add(rfi.assigned_to);
      const { rows } = await pool.query(`
        SELECT DISTINCT u.id FROM sys_users u
        WHERE u.is_active = true AND u.id IN (
          SELECT ur.user_id FROM sys_user_roles ur
          JOIN sys_role_actions ra ON ra.role_id = ur.role_id
          WHERE ra.action_name = 'forms.rfi.write'
        )
      `);
      for (const r of rows) ids.add(r.id);

      for (const uid of ids) {
        await NotificationService.sendNotification({
          targetId: uid,
          title:    `RFI mới (${rfi.type === 'external' ? 'bên ngoài' : 'nội bộ'}): ${rfi.rfi_no}`,
          message:  `Điểm kiểm tra: ${rfi.inspection_point ?? '—'}.`,
          type:     'INFO',
          link:     '/forms/rfi',
        });
      }
    } catch { /* non-blocking */ }
  }
}
