import crypto from 'crypto';
import { createLogger } from '../../../../core/logger.js';

const log = createLogger('ibshi-erp-webhook');

export class IbshiErpWebhookProvider {
  constructor(config = {}) {
    this.mode   = config.mode ?? 'mock';
    this.url    = config.url ?? '';
    this.secret = config.secret ?? '';
  }

  async send(eventType, payload) {
    const envelope = {
      event_type: eventType,
      event_id:   crypto.randomUUID(),
      timestamp:  new Date().toISOString(),
      source:     'qaqc',
      version:    'v1',
      payload,
    };

    if (this.mode === 'mock') {
      log.info({ eventType, envelope }, 'Webhook [mock] — not sending HTTP');
      return;
    }

    const body = JSON.stringify(envelope);
    const sig  = crypto.createHmac('sha256', this.secret).update(body).digest('hex');

    const res = await fetch(this.url, {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'X-QAQC-Signature':  sig,
        'X-Event-Id':        envelope.event_id,
      },
      body,
    });

    if (!res.ok) throw new Error(`Webhook POST failed: ${res.status} ${res.statusText}`);
  }

  async healthCheck() {
    if (this.mode === 'mock') return { message: 'mock OK' };
    if (!this.url) throw new Error('Webhook URL not configured');
    return { message: `Webhook configured: ${this.url}` };
  }
}
