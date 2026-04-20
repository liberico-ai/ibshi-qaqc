import { standardsRepo } from '../repositories/StandardsRepository.js';

export class StandardsSearchService {
  static async search({ query, grp, tier, status = 'ACTIVE', limit = 20, offset = 0 }) {
    return standardsRepo.search({ query, grp, tier, status, limit, offset });
  }
}
