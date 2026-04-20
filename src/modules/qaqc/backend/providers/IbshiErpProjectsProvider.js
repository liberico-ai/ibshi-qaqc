import { createLogger } from '../../../../core/logger.js';

const log = createLogger('ibshi-erp-projects');

const MOCK_PROJECTS = [
  { id: 'ERP-001', code: 'IBS-2024-001', name: 'Offshore Platform Alpha', customer: 'PetroVN', status: 'ACTIVE' },
  { id: 'ERP-002', code: 'IBS-2024-002', name: 'Pipeline Extension Beta',  customer: 'GasVN',   status: 'ACTIVE' },
  { id: 'ERP-003', code: 'IBS-2024-003', name: 'Storage Tank Gamma',       customer: 'OilCorp', status: 'ACTIVE' },
];

export class IbshiErpProjectsProvider {
  constructor(config = {}) {
    this.mode   = config.mode ?? 'mock';
    this.url    = config.url ?? '';
    this.token  = config.token ?? '';
  }

  async listProjects(cursor = null) {
    if (this.mode === 'mock') {
      log.info('listProjects [mock]');
      return MOCK_PROJECTS;
    }
    const url = `${this.url}/api/v1/projects${cursor ? `?cursor=${cursor}` : ''}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${this.token}` } });
    if (!res.ok) throw new Error(`ERP projects fetch failed: ${res.status}`);
    const json = await res.json();
    return json.data ?? [];
  }

  async healthCheck() {
    if (this.mode === 'mock') return { message: 'mock OK' };
    const res = await fetch(`${this.url}/api/v1/projects?cursor=`, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
    return { message: 'ERP projects endpoint reachable' };
  }
}
