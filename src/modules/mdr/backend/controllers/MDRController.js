import fs from 'fs';
import { paginate } from '../../../../core/db.js';
import { mdrRepo } from '../repositories/MDRRepository.js';
import { MDRService } from '../services/MDRService.js';
import { AppError } from '../../../../core/errors.js';

export class MDRController {
  static async getAll(req, res) {
    const { limit, offset, page } = paginate(req);
    const filter = {};
    if (req.query.projectId) filter.project_id = req.query.projectId;
    if (req.query.status)    filter.status     = req.query.status;
    const { data, meta } = await mdrRepo.findAndCountList(filter, { limit, offset });
    res.json({ data, pagination: { page, limit, total: meta.total, totalPages: meta.totalPages } });
  }

  static async getOne(req, res) {
    const detail = await mdrRepo.findDetail(req.params.id);
    if (!detail) throw new AppError(404, 'Không tìm thấy hồ sơ MDR');
    res.json({ data: detail });
  }

  static async create(req, res) {
    const data = req.validated ?? req.body;
    const detail = await MDRService.createDossier(data, req.user?.id ?? null);
    res.status(201).json({ data: detail });
  }

  static async scan(req, res) {
    const result = await MDRService.scanCompleteness(req.params.id);
    res.json({ data: result });
  }

  static async missing(req, res) {
    const missing = await MDRService.listMissing(req.params.id);
    res.json({ data: missing });
  }

  static async addDocument(req, res) {
    const payload = req.validated ?? req.body;
    const doc = await MDRService.addDocument(req.params.id, payload, req.user?.id ?? null);
    res.status(201).json({ data: doc });
  }

  static async updateDocument(req, res) {
    const fields = req.validated ?? req.body;
    const doc = await MDRService.updateDocument(req.params.id, req.params.docId, fields);
    res.json({ data: doc });
  }

  static async createTransmittal(req, res) {
    const payload = req.validated ?? req.body;
    const record = await MDRService.createTransmittal(req.params.id, payload, req.user?.id ?? null);
    res.status(201).json({ data: record });
  }

  static async listTransmittals(req, res) {
    const rows = await mdrRepo.listTransmittals(req.params.id);
    res.json({ data: rows });
  }

  static async compile(req, res) {
    const result = await MDRService.compileBundle(req.params.id);
    res.download(result.path, 'MDR_Bundle.pdf', (err) => {
      if (!err) fs.unlink(result.path, () => {});
    });
  }

  static async submit(req, res) {
    const { client } = req.validated ?? req.body;
    const result = await MDRService.buildSubmission(req.params.id, client);
    res.setHeader('X-Transmittal-No', result.transmittal_no);
    res.download(result.path, 'MDR_Submission.zip', (err) => {
      if (!err) fs.unlink(result.path, () => {});
    });
  }
}
