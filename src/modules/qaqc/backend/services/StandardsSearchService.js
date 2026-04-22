import { pool } from '../../../../core/db.js';
import { standardsRepo } from '../repositories/StandardsRepository.js';

export class StandardsSearchService {
  static async search({ query, grp, tier, status = 'ACTIVE', limit = 20, offset = 0 }) {
    return standardsRepo.search({ query, grp, tier, status, limit, offset });
  }

  static async vectorSearch(queryEmbedding, { limit = 8, standardIds = null } = {}) {
    const vectorLiteral = `[${queryEmbedding.join(',')}]`;
    const params = [vectorLiteral, limit];
    let extraWhere = '';
    if (standardIds?.length) {
      params.push(standardIds);
      extraWhere = `AND c.standard_id = ANY($${params.length})`;
    }
    const { rows } = await pool.query(
      `SELECT c.id, c.standard_id, c.chunk_idx, c.text, c.metadata,
              1 - (c.embedding <=> $1::vector) AS similarity,
              s.code AS standard_code, s.title AS standard_title
       FROM qaqc_standard_chunks c
       JOIN qaqc_standards s ON s.id = c.standard_id
       WHERE c.embedding IS NOT NULL
         AND s.status = 'ACTIVE'
         ${extraWhere}
       ORDER BY c.embedding <=> $1::vector
       LIMIT $2`,
      params
    );
    return rows;
  }

  static async ftsSearch(query, { limit = 8 } = {}) {
    const { rows } = await pool.query(
      `SELECT c.id, c.standard_id, c.chunk_idx, c.text, c.metadata,
              0.5 AS similarity,
              s.code AS standard_code, s.title AS standard_title
       FROM qaqc_standard_chunks c
       JOIN qaqc_standards s ON s.id = c.standard_id
       WHERE s.status = 'ACTIVE'
         AND to_tsvector('english', c.text) @@ plainto_tsquery('english', $1)
       LIMIT $2`,
      [query, limit]
    );
    return rows;
  }
}
