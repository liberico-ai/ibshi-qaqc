import { paginate } from '../../../../core/db.js';
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
    const { project_id, po_ref, po_line_ids, supplier_id } = req.body;
    if (!project_id) throw new AppError(400, 'project_id required');
    const record = await mirRepo.create({
      project_id, po_ref, po_line_ids: JSON.stringify(po_line_ids ?? []),
      supplier_id, stage: 'EXPECTED', created_by: req.user?.id ?? null,
    });
    res.status(201).json({ data: record });
  }

  static async uploadMTC(req, res) {
    const { standard_id, heat_no, grade, supplier, file_url, ocr_extracted } = req.body;
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

    const result = await MIRCrossCheckService.crossCheck(cert.id, req.body.standard_id ?? cert.standard_id);
    await MIRWorkflowService.advance(req.params.id, 'MTC_VERIFIED');
    res.json({ data: result });
  }

  static async decide(req, res) {
    const { decision, waiver_note, ai_result } = req.body;
    const record = await MIRWorkflowService.decide(req.params.id, decision, req.user?.id, waiver_note, ai_result);
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

  static async exportExcel(req, res) {
    res.status(501).json({ error: 'Excel export not yet implemented' });
  }
}
