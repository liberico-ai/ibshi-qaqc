import { createLogger } from '../../../../core/logger.js';

const log = createLogger('ibshi-erp-nas');

const MOCK_FILES = [
  { id: 'F001', name: 'ITP-Template-Pipe.xlsx',    size: 45000, modified_at: '2024-01-15T08:00:00Z' },
  { id: 'F002', name: 'Standard-ASTM-A36.pdf',      size: 280000, modified_at: '2024-02-01T09:30:00Z' },
  { id: 'F003', name: 'MIR-Template-v2.docx',       size: 35000,  modified_at: '2024-03-10T14:00:00Z' },
];

export class IbshiErpNASProvider {
  constructor(config = {}) {
    this.mode  = config.mode ?? 'mock';
    this.url   = config.url ?? '';
    this.token = config.token ?? '';
  }

  async listFiles(path = '/') {
    if (this.mode === 'mock') {
      log.info({ path }, 'listFiles [mock]');
      return MOCK_FILES;
    }
    const res = await fetch(`${this.url}/api/v1/files?path=${encodeURIComponent(path)}`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) throw new Error(`NAS listFiles failed: ${res.status}`);
    return (await res.json()).data ?? [];
  }

  async getSignedUrl(fileId) {
    if (this.mode === 'mock') {
      return { signed_url: `https://mock-nas.local/files/${fileId}?token=mock`, expires_in: 3600 };
    }
    const res = await fetch(`${this.url}/api/v1/files/${fileId}/signed-url`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) throw new Error(`NAS signed URL failed: ${res.status}`);
    return res.json();
  }

  async healthCheck() {
    if (this.mode === 'mock') return { message: 'mock OK' };
    const res = await fetch(`${this.url}/api/v1/files?path=/`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) throw new Error(`NAS health check failed: ${res.status}`);
    return { message: 'NAS endpoint reachable' };
  }
}
