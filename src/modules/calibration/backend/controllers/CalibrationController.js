import { paginate } from '../../../../core/db.js';
import { calMasterRepo, calDeviceRepo, calRecordRepo } from '../repositories/CalibrationRepository.js';
import { AppError } from '../../../../core/errors.js';

export class CalibrationController {
  // ── Master List ────────────────────────────────────────────
  static async getMasters(req, res) {
    const { limit, offset, page } = paginate(req);
    const { data, meta } = await calMasterRepo.findAndCount({}, { limit, offset, page, orderBy: 'year DESC' });
    res.json({ data, pagination: { page, limit, total: meta.total, totalPages: meta.totalPages } });
  }

  static async createMaster(req, res) {
    const record = await calMasterRepo.create(req.validated ?? req.body);
    res.status(201).json({ data: record });
  }

  // ── Devices (Master Log view) ──────────────────────────────
  static async getDevices(req, res) {
    const { limit, offset, page, search } = paginate(req);
    const filter = {};
    if (req.query.status)    filter.status    = req.query.status;
    if (req.query.masterId)  filter.master_id = req.query.masterId;
    if (search)              filter.search    = search;
    const warnDays = parseInt(req.query.warnDays, 10) || 30;
    const { data, total } = await calDeviceRepo.findWithStatus(filter, { limit, offset, warnDays });
    res.json({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  }

  static async getDevice(req, res) {
    const record = await calDeviceRepo.findDetail(req.params.id);
    if (!record) throw new AppError(404, 'Không tìm thấy thiết bị');
    res.json({ data: record });
  }

  static async createDevice(req, res) {
    const record = await calDeviceRepo.create(req.validated ?? req.body);
    res.status(201).json({ data: record });
  }

  static async updateDevice(req, res) {
    const existing = await calDeviceRepo.findOne(req.params.id);
    if (!existing) throw new AppError(404, 'Không tìm thấy thiết bị');
    const record = await calDeviceRepo.update(req.params.id, req.validated ?? req.body);
    res.json({ data: record });
  }

  // ── Calibration records ────────────────────────────────────
  static async createRecord(req, res) {
    const body = req.validated ?? req.body;
    const device = await calDeviceRepo.findOne(body.device_id);
    if (!device) throw new AppError(404, 'Không tìm thấy thiết bị');
    const record = await calRecordRepo.create(body);
    res.status(201).json({ data: record });
  }
}
