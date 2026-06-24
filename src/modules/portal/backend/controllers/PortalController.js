import { PortalService } from '../services/PortalService.js';
import { AppError } from '../../../../core/errors.js';

export class PortalController {
  static async getProjects(req, res) {
    const data = await PortalService.listProjects(req.user?.id);
    res.json({ data });
  }

  static async getProjectSummary(req, res) {
    const data = await PortalService.projectSummary(req.user?.id, req.params.projectId);
    if (!data) throw new AppError(403, 'Bạn không có quyền truy cập dự án này');
    res.json({ data });
  }
}
