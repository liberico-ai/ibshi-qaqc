import { ProviderService } from '../../../system/backend/services/ProviderService.js';
import { projectsRepo } from '../repositories/ProjectsRepository.js';
import { createLogger } from '../../../../core/logger.js';

const log = createLogger('project-sync');

export class ProjectSyncService {
  static async sync() {
    const provider = await ProviderService.getInstanceByClass('ibshi-erp-projects');
    const projects = await provider.listProjects();
    await projectsRepo.upsertFromErp(projects);
    log.info({ count: projects.length }, 'Projects synced from ERP');
    return { synced: projects.length };
  }
}
