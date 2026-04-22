import { GoogleGenerativeAI } from '@google/generative-ai';
import { StandardsSearchService } from '../services/StandardsSearchService.js';
import { createLogger } from '../../../../core/logger.js';

const log = createLogger('ai-standards-lookup');

const SYSTEM_PROMPT = `You are a QA/QC standards expert assistant.
RULES:
1. You MUST cite every fact with format: [STANDARD_CODE § SECTION, p.PAGE]
2. Use ONLY information from the provided context chunks.
3. If information is not in context, respond with exactly: NOT_FOUND: <reason>
4. Do not invent, extrapolate, or use training knowledge outside the context.

OUTPUT FORMAT — respond with valid JSON only, no markdown fences:
{
  "summary": "...",
  "citations": [
    { "standard": "ASME BPVC IX 2023", "section": "QW-252.1", "page": 142, "chunk_id": "uuid", "chunk_text": "..." }
  ],
  "confidence": 0.87,
  "not_found_reasons": []
}`;

export class AIStandardsLookupProvider {
  constructor(config = {}) {
    this.mode   = config.mode ?? 'rule-based';
    this.apiKey = config.api_key ?? process.env.GEMINI_API_KEY ?? null;
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
      citations: [],
      not_found_reasons: [],
    };
  }

  async _geminiLookup(query, filters) {
    try {
      const genAI = new GoogleGenerativeAI(this.apiKey);

      // 1. Embed the query
      const embedModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
      const embedResult = await embedModel.embedContent({
        content: { role: 'user', parts: [{ text: query }] },
      });
      const queryEmbedding = embedResult.embedding.values;

      // 2. Vector similarity search → retrieve top-8 chunks
      let chunks = await StandardsSearchService.vectorSearch(queryEmbedding, { limit: 8 });

      // 3. Fallback to FTS when no chunks have embeddings
      if (!chunks.length) {
        log.warn('No embedded chunks found; falling back to FTS');
        chunks = await StandardsSearchService.ftsSearch(query, { limit: 8 });
      }

      if (!chunks.length) {
        return {
          summary: null,
          citations: [],
          confidence: 0,
          not_found_reasons: ['Không có chunks nào trong thư viện tiêu chuẩn'],
          source: 'gemini-vector',
        };
      }

      // 4. Build context with full metadata
      const context = chunks.map((c, i) => {
        const meta = c.metadata ?? {};
        return `[CHUNK ${i + 1}] id:${c.id} standard:${c.standard_code} page:${meta.page_approx ?? '?'} section:${meta.section ?? '?'}\n${c.text}`;
      }).join('\n\n---\n\n');

      // 5. Call Gemini with structured prompt
      const chatModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const chat = chatModel.startChat({
        systemInstruction: SYSTEM_PROMPT,
      });
      const result = await chat.sendMessage(
        `CONTEXT:\n${context}\n\nQUESTION: ${query}`
      );
      const raw = result.response.text().trim();

      // 6. Parse JSON response
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        if (raw.startsWith('NOT_FOUND:')) {
          return {
            summary: null,
            citations: [],
            confidence: 0,
            not_found_reasons: [raw.replace('NOT_FOUND:', '').trim()],
            source: 'gemini-vector',
          };
        }
        // Attempt to extract JSON from response
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('LLM response was not valid JSON');
        }
      }

      // 7. Calibrate confidence: weight LLM confidence by avg chunk similarity
      const avgSimilarity = chunks.reduce((s, c) => s + (c.similarity ?? 0.5), 0) / chunks.length;
      const llmConfidence = typeof parsed.confidence === 'number' ? parsed.confidence : 0.5;
      parsed.confidence = Math.round(avgSimilarity * llmConfidence * 100) / 100;

      // 8. Enrich citations with chunk_text from retrieved chunks
      if (Array.isArray(parsed.citations)) {
        parsed.citations = parsed.citations.map(cite => {
          const match = chunks.find(c => c.id === cite.chunk_id);
          return { ...cite, chunk_text: match?.text ?? cite.chunk_text ?? null };
        });
      }

      return { ...parsed, source: 'gemini-vector' };

    } catch (err) {
      log.error({ err }, 'Gemini lookup failed; falling back to rule-based');
      return this._ruleBasedLookup(query, filters);
    }
  }

  async healthCheck() {
    return { message: `AI-1 Standards Lookup [${this.mode}] OK` };
  }
}
