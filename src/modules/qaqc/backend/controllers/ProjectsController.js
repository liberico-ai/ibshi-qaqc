import { paginate } from '../../../../core/db.js';
import { projectsRepo } from '../repositories/ProjectsRepository.js';
import { ProjectSyncService } from '../services/ProjectSyncService.js';
import { AppError } from '../../../../core/errors.js';

export class ProjectsController {
  static async getAll(req, res) {
    const { limit, offset, page } = paginate(req);
    const { data, meta } = await projectsRepo.findAndCount({}, { limit, offset, orderBy: 'code ASC' });
    res.json({ data, pagination: { page, limit, total: meta.total, totalPages: meta.totalPages } });
  }

  static async sync(req, res) {
    const result = await ProjectSyncService.sync();
    res.json(result);
  }
}
