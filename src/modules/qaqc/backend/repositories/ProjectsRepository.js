import { Repository } from '../../../../core/db.js';

class ProjectsRepository extends Repository {
  constructor() {
    super('qaqc_projects', {});
  }

  async findByCode(code) {
    const rows = await this.find({ code });
    return rows[0] ?? null;
  }

  async upsertFromErp(projects) {
    for (const p of projects) {
      await this.upsert(
        { code: p.code, name: p.name, customer: p.customer ?? null, status: p.status ?? 'ACTIVE', erp_source_id: p.id ?? null, synced_at: new Date() },
        ['code']
      );
    }
  }
}

export const projectsRepo = new ProjectsRepository();
