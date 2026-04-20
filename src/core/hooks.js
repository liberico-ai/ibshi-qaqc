import { createLogger } from './logger.js';

const log = createLogger('hooks');

export class Hooks {
  constructor() {
    this.actions = new Map();
    this.filters = new Map();
  }

  /**
   * Register an action hook.
   * @param {string}   hookName
   * @param {Function} callback
   * @param {Object}   [options]
   * @param {number}   [options.priority=10]  — lower runs first
   * @param {boolean}  [options.critical=true] — if false, errors are caught & logged (non-blocking)
   */
  addAction(hookName, callback, options = {}) {
    // Backward-compat: 3rd arg can be a number (old API) or options object
    const opts = typeof options === 'number'
      ? { priority: options, critical: true }
      : { priority: 10, critical: true, ...options };

    if (!this.actions.has(hookName)) this.actions.set(hookName, []);
    this.actions.get(hookName).push({ callback, ...opts });
    this.actions.get(hookName).sort((a, b) => a.priority - b.priority);
  }

  /**
   * Execute all action callbacks for a hook sequentially.
   * - critical hooks (default): error propagates → caller sees the error
   * - non-critical hooks: error is caught & logged, pipeline continues
   */
  async doAction(hookName, ...args) {
    if (!this.actions.has(hookName)) return;
    for (const { callback, critical } of this.actions.get(hookName)) {
      if (critical) {
        await callback(...args);
      } else {
        try {
          await callback(...args);
        } catch (e) {
          log.error(e, `Non-critical hook error in "${hookName}"`);
        }
      }
    }
  }

  addFilter(hookName, callback, priority = 10) {
    if (!this.filters.has(hookName)) this.filters.set(hookName, []);
    this.filters.get(hookName).push({ callback, priority });
    this.filters.get(hookName).sort((a, b) => a.priority - b.priority);
  }

  async applyFilters(hookName, value, ...args) {
    if (!this.filters.has(hookName)) return value;
    let result = value;
    for (const { callback } of this.filters.get(hookName)) {
      result = await callback(result, ...args);
    }
    return result;
  }
}

export const hooks = new Hooks();
