import { paginate } from '../../../../core/db.js';
import { AppError } from '../../../../core/errors.js';
import { providersRepo } from '../repositories/ProvidersRepository.js';
import { ProviderService } from '../services/ProviderService.js';
import { providerRegistry } from '../../../../core/provider-registry.js';

export class ProvidersController {
  static async getAll(req, res) {
    const { limit, offset, page } = paginate(req);
    const { data, meta } = await providersRepo.findAndCount({}, { limit, offset, orderBy: 'module ASC' });
    res.json({ data, pagination: { page, limit, total: meta.total, totalPages: meta.totalPages } });
  }

  static async getClasses(_req, res) {
    res.json({ data: providerRegistry.listClasses() });
  }

  static async getOne(req, res) {
    const record = await providersRepo.findOne(req.params.id);
    if (!record) throw new AppError(404, 'Provider not found');
    res.json({ data: _sanitize(record) });
  }

  static async create(req, res) {
    const { name, class_name, module: mod, config, is_active, description } = req.body;

    const ProviderClass = providerRegistry.getClass(class_name);
    if (!ProviderClass) throw new AppError(400, `Unknown provider class: "${class_name}"`);

    const encryptedConfig = config ? ProviderService.encryptConfig(
      typeof config === 'string' ? JSON.parse(config) : config
    ) : null;

    const record = await providersRepo.create({
      name,
      class_name,
      module: mod ?? 'unknown',
      config: encryptedConfig,
      is_active: is_active ?? true,
      description: description ?? '',
    });

    res.status(201).json({ data: _sanitize(record) });
  }

  static async update(req, res) {
    const { id } = req.params;
    const existing = await providersRepo.findOne(id);
    if (!existing) throw new AppError(404, 'Provider not found');

    const data = {};
    if (req.body.name !== undefined) data.name = req.body.name;
    if (req.body.description !== undefined) data.description = req.body.description;
    if (req.body.is_active !== undefined) data.is_active = req.body.is_active;
    if (req.body.config !== undefined) {
      const cfg = req.body.config;
      data.config = ProviderService.encryptConfig(
        typeof cfg === 'string' ? JSON.parse(cfg) : cfg
      );
    }

    const record = await providersRepo.update(id, data);
    res.json({ data: _sanitize(record) });
  }

  static async test(req, res) {
    const result = await ProviderService.testProvider(req.params.id);
    res.json(result);
  }

  static async softDelete(req, res) {
    const existing = await providersRepo.findOne(req.params.id);
    if (!existing) throw new AppError(404, 'Provider not found');
    await providersRepo.softDelete(req.params.id);
    res.json({ message: 'Provider deactivated' });
  }
}

function _sanitize(record) {
  const copy = { ...record };
  delete copy.config; // never expose encrypted config
  return copy;
}
