import { StandardsSearchService } from '../services/StandardsSearchService.js';
import { createLogger } from '../../../../core/logger.js';

const log = createLogger('ai-standards-lookup');

export class AIStandardsLookupProvider {
  constructor(config = {}) {
    this.mode   = config.mode ?? 'rule-based';
    this.apiKey = config.api_key ?? null;
  }

  async lookup(query, filters = {}) {
    if (this.mode === 'rule-based' || !this.apiKey) {
      return this._ruleBasedLookup(query, filters);
    }
    return this._geminiLookup(query, filters);
  }

  async _ruleBasedLookup(query, filters) {
    const { data, total } = await StandardsSearchService.search({ query, ...filters });
    return {
      results: data,
      total,
      source: 'rule-based-fts',
      confidence: 1.0,
    };
  }

  async _geminiLookup(query, filters) {
    log.warn('Gemini lookup not implemented; falling back to rule-based');
    return this._ruleBasedLookup(query, filters);
  }

  async healthCheck() {
    return { message: `AI-1 Standards Lookup [${this.mode}] OK` };
  }
}
