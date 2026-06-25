import * as XLSX from 'xlsx';
import { paginate, pool } from '../../../../core/db.js';
import { mirRepo } from '../repositories/MIRRepository.js';
import { MIRWorkflowService } from '../services/MIRWorkflowService.js';
import { MIRCrossCheckService } from '../services/MIRCrossCheckService.js';
import { AppError } from '../../../../core/errors.js';

export class MIRController {
  static async getAll(req, res) {
    const { limit, offset, page } = paginate(req);
    const filter = {};
    if (req.query.projectId)   filter.project_id  = req.query.projectId;
    if (req.query.stage)       filter.stage        = req.query.stage;
    if (req.query.supplierId)  filter.supplier_id  = req.query.supplierId;
    const { data, meta } = await mirRepo.findAndCount(filter, { limit, offset, orderBy: 'created_at DESC' });
    res.json({ data, pagination: { page, limit, total: meta.total, totalPages: meta.totalPages } });
  }

  static async getOne(req, res) {
    const record = await mirRepo.findDetail(req.params.id);
    if (!record) throw new AppError(404, 'MIR not found');
    res.json({ data: record });
  }

  static async create(req, res) {
    const { project_id, po_ref, po_line_ids, supplier_id } = req.validated ?? req.body;
    if (!project_id) throw new AppError(400, 'project_id required');
    const record = await mirRepo.create({
      project_id, po_ref, po_line_ids: JSON.stringify(po_line_ids ?? []),
      supplier_id, stage: 'EXPECTED', created_by: req.user?.id ?? null,
    });
    res.status(201).json({ data: record });
  }

  static async uploadMTC(req, res) {
    const { standard_id, heat_no, grade, supplier, file_url, ocr_extracted } = req.validated ?? req.body;
    const mir = await mirRepo.findOne(req.params.id);
    if (!mir) throw new AppError(404, 'MIR not found');

    const cert = await mirRepo.addCert({ mir_id: req.params.id, standard_id, heat_no, grade, supplier, file_url, ocr_extracted });
    await MIRWorkflowService.advance(req.params.id, 'DOC_RECEIVED');
    res.status(201).json({ data: cert });
  }

  static async recordPhysical(req, res) {
    await MIRWorkflowService.advance(req.params.id, 'PHYSICAL_INSPECTED');
    res.json({ message: 'Physical inspection recorded' });
  }

  static async crossCheck(req, res) {
    const mir = await mirRepo.findDetail(req.params.id);
    if (!mir) throw new AppError(404, 'MIR not found');

    const cert = mir.certs[0];
    if (!cert) throw new AppError(400, 'No MTC cert found for this MIR');

    const result = await MIRCrossCheckService.crossCheck(cert.id, (req.validated ?? req.body).standard_id ?? cert.standard_id);
    await MIRWorkflowService.advance(req.params.id, 'MTC_VERIFIED');
    res.json({ data: result });
  }

  static async decide(req, res) {
    const { decision, waiver_note, ai_result, pin } = req.validated ?? req.body;
    const record = await MIRWorkflowService.decide(req.params.id, decision, req.user?.id, waiver_note, ai_result, pin);
    res.json({ data: record });
  }

  static async warehouseEntry(req, res) {
    await MIRWorkflowService.advance(req.params.id, 'INSTOCK');
    res.json({ message: 'Warehouse entry recorded' });
  }

  static async getAudit(req, res) {
    const trail = await mirRepo.getAuditTrail(req.params.id);
    res.json({ data: trail });
  }

  /**
   * Xuất danh sách MIR ra file Excel (.xlsx).
   * Hỗ trợ cùng bộ lọc với endpoint danh sách: projectId, stage, supplierId.
   * Tiêu đề cột tiếng Việt: Mã MIR, Dự án, Vật tư (Heat/Grade), Nhà cung cấp,
   * Trạng thái, Quyết định, Ngày tạo, Ngày cập nhật.
   */
  static async exportExcel(req, res) {
    // Bộ lọc tương đương getAll — dùng tham số hoá để tránh SQL injection.
    const params = [];
    const where = [];
    if (req.query.projectId)  { params.push(req.query.projectId);  where.push(`m.project_id = $${params.length}`); }
    if (req.query.stage)      { params.push(req.query.stage);      where.push(`m.stage = $${params.length}`); }
    if (req.query.supplierId) { params.push(req.query.supplierId); where.push(`m.supplier_id = $${params.length}`); }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // Lấy MIR + mã dự án + chứng chỉ vật tư mới nhất + quyết định gần nhất.
    const { rows } = await pool.query(`
      SELECT
        m.id,
        m.po_ref,
        m.stage,
        m.supplier_id,
        m.created_at,
        m.updated_at,
        p.code AS project_code,
        c.heat_no,
        c.grade,
        c.supplier AS cert_supplier,
        a.decision
      FROM qaqc_mir_records m
      JOIN qaqc_projects p ON p.id = m.project_id
      LEFT JOIN LATERAL (
        SELECT heat_no, grade, supplier FROM qaqc_material_certs
        WHERE mir_id = m.id ORDER BY created_at DESC LIMIT 1
      ) c ON TRUE
      LEFT JOIN LATERAL (
        SELECT decision FROM qaqc_acceptances
        WHERE mir_id = m.id ORDER BY decided_at DESC LIMIT 1
      ) a ON TRUE
      ${whereClause}
      ORDER BY m.created_at DESC
    `, params);

    const fmt = (d) => (d ? new Date(d).toISOString().slice(0, 19).replace('T', ' ') : '');
    const aoa = rows.map((r) => ({
      'Mã MIR':       r.po_ref || r.id,
      'Dự án':        r.project_code || '',
      'Vật tư':       [r.heat_no, r.grade].filter(Boolean).join(' / '),
      'Nhà cung cấp': r.cert_supplier || r.supplier_id || '',
      'Trạng thái':   r.stage || '',
      'Quyết định':   r.decision || '',
      'Ngày tạo':     fmt(r.created_at),
      'Ngày cập nhật': fmt(r.updated_at),
    }));

    const ws = XLSX.utils.json_to_sheet(aoa, {
      header: ['Mã MIR', 'Dự án', 'Vật tư', 'Nhà cung cấp', 'Trạng thái', 'Quyết định', 'Ngày tạo', 'Ngày cập nhật'],
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MIR');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    const filename = `MIR_${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  }
}
