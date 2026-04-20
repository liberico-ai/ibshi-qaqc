import { MIRCrossCheckService } from '../services/MIRCrossCheckService.js';
import { createLogger } from '../../../../core/logger.js';

const log = createLogger('ai-mtc-crosscheck');

export class AIMTCCrossCheckProvider {
  constructor(config = {}) {
    this.mode   = config.mode ?? 'rule-based';
    this.apiKey = config.api_key ?? null;
  }

  async crossCheck(mtcId, standardId) {
    if (this.mode === 'rule-based' || !this.apiKey) {
      return MIRCrossCheckService.crossCheck(mtcId, standardId);
    }
    log.warn('Gemini cross-check not implemented; falling back to rule-based');
    return MIRCrossCheckService.crossCheck(mtcId, standardId);
  }

  async healthCheck() {
    return { message: `AI-2 MTC Cross-Check [${this.mode}] OK` };
  }
}
