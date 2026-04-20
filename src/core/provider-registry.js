import { createLogger } from './logger.js';

const log = createLogger('provider-registry');

class ProviderRegistry {
  constructor() {
    this._classes = new Map(); // className → { ProviderClass, module, description }
  }

  /**
   * @param {string} className  - e.g. 'ibshi-erp-webhook'
   * @param {Function} ProviderClass
   * @param {string} module     - module that owns this class, e.g. 'qaqc'
   * @param {string} [description]
   */
  register(className, ProviderClass, module, description = '') {
    if (this._classes.has(className)) {
      log.warn({ className, module }, 'Provider class already registered – overwriting');
    }
    this._classes.set(className, { ProviderClass, module, description });
    log.debug({ className, module }, 'Provider class registered');
  }

  /** @returns {Function|null} */
  getClass(className) {
    return this._classes.get(className)?.ProviderClass ?? null;
  }

  /** @returns {{ className: string, module: string, description: string }[]} */
  listClasses() {
    return Array.from(this._classes.entries()).map(([className, meta]) => ({
      className,
      module: meta.module,
      description: meta.description,
    }));
  }
}

export const providerRegistry = new ProviderRegistry();
