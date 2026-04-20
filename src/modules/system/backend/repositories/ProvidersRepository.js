import { Repository } from '../../../../core/db.js';

class ProvidersRepository extends Repository {
  constructor() {
    super('sys_providers', { trackActor: true });
  }

  async findByClassName(className) {
    return this.find({ class_name: className, is_active: true });
  }

  async findActive() {
    return this.find({ is_active: true }, { orderBy: 'module ASC' });
  }

  async softDelete(id) {
    return this.update(id, { is_active: false });
  }
}

export const providersRepo = new ProvidersRepository();
