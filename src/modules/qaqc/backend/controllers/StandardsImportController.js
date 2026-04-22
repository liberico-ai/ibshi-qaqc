import multer from 'multer';
import { StandardsImportService } from '../services/StandardsImportService.js';
import { AppError } from '../../../../core/errors.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 20 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new AppError(400, 'Chỉ chấp nhận file PDF'));
    }
    cb(null, true);
  },
});

export const uploadMiddleware = upload.array('files', 20);

export class StandardsImportController {
  static async enqueue(req, res) {
    const files = req.files;
    if (!files?.length) throw new AppError(400, 'Không có file nào được upload');

    const metadata = {
      family: req.body.family ?? null,
      year: req.body.year ? parseInt(req.body.year, 10) : null,
      language: req.body.language ?? 'EN',
      standardId: req.body.standard_id ?? null,
    };

    const jobs = await StandardsImportService.enqueueBatch(files, metadata, req.user?.id);
    res.status(202).json({ data: jobs });
  }

  static async listJobs(req, res) {
    const limit = Math.min(parseInt(req.query.limit ?? 20, 10), 100);
    const offset = parseInt(req.query.offset ?? 0, 10);
    const status = req.query.status ?? undefined;
    const result = await StandardsImportService.listJobs({ limit, offset, status });
    res.json({ data: result.rows, total: result.total });
  }

  static async getJob(req, res) {
    const job = await StandardsImportService.getJobStatus(req.params.id);
    if (!job) throw new AppError(404, 'Import job không tồn tại');
    res.json({ data: job });
  }

  static async retryJob(req, res) {
    const result = await StandardsImportService.retryFailed(req.params.id);
    res.json({ data: result });
  }

  static async supersede(req, res) {
    const { old_standard_id } = req.validated ?? req.body;
    if (!old_standard_id) throw new AppError(400, 'old_standard_id required');
    await StandardsImportService.supersede(old_standard_id, req.params.standardId, req.user?.id);
    res.json({ data: { superseded: true } });
  }
}
