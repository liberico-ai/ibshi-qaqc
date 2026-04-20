import { createLogger } from '../../../../core/logger.js';

const log = createLogger('ibshi-erp-sso');

export class IbshiErpSSOProvider {
  constructor(config = {}) {
    this.mode  = config.mode ?? 'mock';
    this.url   = config.url ?? '';
    this.token = config.token ?? '';
  }

  async exchangeToken(erpJwt) {
    if (this.mode === 'mock') {
      log.info('exchangeToken [mock]');
      return { token: 'mock-qaqc-token', user: { id: 1, username: 'mock_user', roles: ['qc_inspector'] } };
    }
    const res = await fetch(`${this.url}/api/v1/auth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ erp_token: erpJwt }),
    });
    if (!res.ok) throw new Error(`SSO exchange failed: ${res.status}`);
    return res.json();
  }

  async getMe(token) {
    if (this.mode === 'mock') {
      return { id: 1, username: 'mock_user', email: 'mock@ibshi.com', roles: ['qc_inspector'] };
    }
    const res = await fetch(`${this.url}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`SSO getMe failed: ${res.status}`);
    return res.json();
  }

  async healthCheck() {
    if (this.mode === 'mock') return { message: 'mock OK' };
    const res = await fetch(`${this.url}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${this.token}` },
    });
    if (!res.ok) throw new Error(`SSO health check failed: ${res.status}`);
    return { message: 'SSO endpoint reachable' };
  }
}
