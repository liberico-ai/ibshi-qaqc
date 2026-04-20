import { SettingsService } from '../../../../core/settings.js';
import { providerRegistry } from '../../../../core/provider-registry.js';
import { providersRepo } from '../repositories/ProvidersRepository.js';
import { AppError } from '../../../../core/errors.js';
import { createLogger } from '../../../../core/logger.js';

const log = createLogger('provider-service');

export class ProviderService {
  /**
   * Instantiate a provider by its display name.
   * @param {string} name  - sys_providers.name
   * @returns {Promise<object>} provider instance
   */
  static async getInstance(name) {
    const rows = await providersRepo.find({ name, is_active: true });
    const record = rows[0];
    if (!record) throw new AppError(404, `Provider not found: "${name}"`);
    return ProviderService._instantiate(record);
  }

  /**
   * Instantiate the first active provider of a given class.
   * @param {string} className
   * @returns {Promise<object>} provider instance
   */
  static async getInstanceByClass(className) {
    const rows = await providersRepo.findByClassName(className);
    const record = rows[0];
    if (!record) throw new AppError(404, `No active provider found for class: "${className}"`);
    return ProviderService._instantiate(record);
  }

  /** @private */
  static _instantiate(record) {
    const ProviderClass = providerRegistry.getClass(record.class_name);
    if (!ProviderClass) {
      throw new AppError(500, `Provider class not registered: "${record.class_name}". Is the module loaded?`);
    }

    let config = {};
    if (record.config) {
      try {
        const decrypted = SettingsService._decrypt(record.config);
        config = JSON.parse(decrypted);
      } catch {
        log.warn({ name: record.name }, 'Failed to decrypt/parse provider config; using empty config');
      }
    }

    return new ProviderClass(config);
  }

  /**
   * Encrypt a config object for storage.
   * @param {object} configObj
   * @returns {string} encrypted string
   */
  static encryptConfig(configObj) {
    const json = JSON.stringify(configObj);
    return SettingsService._encrypt(json);
  }

  /**
   * Test a provider by calling its healthCheck() method.
   * @param {number} id
   * @returns {Promise<{ok: boolean, message: string}>}
   */
  static async testProvider(id) {
    const record = await providersRepo.findOne(id);
    if (!record) throw new AppError(404, 'Provider not found');

    try {
      const instance = ProviderService._instantiate(record);
      if (typeof instance.healthCheck === 'function') {
        const result = await instance.healthCheck();
        return { ok: true, message: result?.message ?? 'OK' };
      }
      return { ok: true, message: 'No healthCheck method; assuming OK' };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  }
}
