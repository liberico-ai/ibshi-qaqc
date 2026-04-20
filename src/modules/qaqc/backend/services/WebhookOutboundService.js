import { ProviderService } from '../../../system/backend/services/ProviderService.js';
import { createLogger } from '../../../../core/logger.js';

const log = createLogger('webhook-outbound');
const RETRY_DELAYS_MS = [30_000, 120_000, 600_000, 1_800_000, 7_200_000];

export class WebhookOutboundService {
  static async send(eventType, payload) {
    let provider;
    try {
      provider = await ProviderService.getInstanceByClass('ibshi-erp-webhook');
    } catch {
      log.warn({ eventType }, 'No active ibshi-erp-webhook provider; skipping outbound event');
      return;
    }

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
      try {
        await provider.send(eventType, payload);
        log.info({ eventType, attempt }, 'Outbound webhook sent');
        return;
      } catch (err) {
        if (attempt < RETRY_DELAYS_MS.length) {
          const delay = RETRY_DELAYS_MS[attempt];
          log.warn({ eventType, attempt, delay }, `Webhook failed, retry in ${delay}ms`);
          await new Promise(r => setTimeout(r, delay));
        } else {
          log.error({ eventType, err: err.message }, 'Webhook dead-lettered after max retries');
        }
      }
    }
  }
}
