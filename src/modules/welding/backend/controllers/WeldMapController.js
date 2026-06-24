import { paginate } from '../../../../core/db.js';
import { weldMapRepo, weldJointRepo } from '../repositories/WeldingRepository.js';
import { WelderQualService } from '../services/WelderQualService.js';
import { AppError } from '../../../../core/errors.js';

export class WeldMapController {
  static async getAll(req, res) {
    const { limit, offset, page } = paginate(req);
    const filter = {};
    if (req.query.projectId) filter.project_id = req.query.projectId;
    const { data, meta } = await weldMapRepo.findAndCount(filter, { limit, offset, page, orderBy: 'created_at DESC' });
    res.json({ data, pagination: { page, limit, total: meta.total, totalPages: meta.totalPages } });
  }

  static async getOne(req, res) {
    const record = await weldMapRepo.findWithJoints(req.params.id);
    if (!record) throw new AppError(404, 'Không tìm thấy bản đồ mối hàn');
    res.json({ data: record });
  }

  static async create(req, res) {
    const body = req.validated ?? req.body;
    const record = await weldMapRepo.create({
      project_id: body.project_id ?? null,
      drawing_no: body.drawing_no ?? null,
      name: body.name ?? null,
    });
    res.status(201).json({ data: record });
  }

  static async addJoint(req, res) {
    const map = await weldMapRepo.findOne(req.params.id);
    if (!map) throw new AppError(404, 'Không tìm thấy bản đồ mối hàn');
    const body = req.validated ?? req.body;

    // Guard: chặn gán thợ hàn có chứng chỉ hết hạn
    if (body.welder_id) {
      const ok = await WelderQualService.canAssignWelder(body.welder_id);
      if (!ok) throw new AppError(400, 'Không thể gán: chứng chỉ thợ hàn đã hết hạn');
    }

    const record = await weldMapRepo.addJoint({ weld_map_id: req.params.id, ...body });
    res.status(201).json({ data: record });
  }

  static async updateJoint(req, res) {
    const joint = await weldJointRepo.findOne(req.params.jointId);
    if (!joint) throw new AppError(404, 'Không tìm thấy mối hàn');
    const body = req.validated ?? req.body;

    if (body.welder_id) {
      const ok = await WelderQualService.canAssignWelder(body.welder_id);
      if (!ok) throw new AppError(400, 'Không thể gán: chứng chỉ thợ hàn đã hết hạn');
    }

    const record = await weldJointRepo.update(req.params.jointId, body);
    res.json({ data: record });
  }
}
