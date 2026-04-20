import { AppError } from './errors.js';

/**
 * Lightweight input-validation middleware (no external deps).
 * 
 * Usage in routes:
 *   app.post('/users', validate({ username: [required, isString], password: [required, minLength(6)] }), handler)
 * 
 * @param {Object<string, Function[]>} rules - field name → array of validator fns
 */
export function validate(rules) {
  return (req, _res, next) => {
    const errors = [];

    for (const [field, checks] of Object.entries(rules)) {
      const value = req.body[field];
      for (const check of checks) {
        const msg = check(value, field);
        if (msg) {
          errors.push(msg);
          break; // one error per field
        }
      }
    }

    if (errors.length) {
      throw new AppError(400, 'Validation failed', errors);
    }

    next();
  };
}

// ── Validator helpers ────────────────────────────────────────────

export const required = (value, field) =>
  (value === undefined || value === null || value === '')
    ? `${field} is required`
    : null;

export const isString = (value, field) =>
  (value != null && typeof value !== 'string')
    ? `${field} must be a string`
    : null;

export const isBoolean = (value, field) =>
  (value != null && typeof value !== 'boolean')
    ? `${field} must be a boolean`
    : null;

export const isArray = (value, field) =>
  (value != null && !Array.isArray(value))
    ? `${field} must be an array`
    : null;

export const minLength = (min) => (value, field) =>
  (typeof value === 'string' && value.length < min)
    ? `${field} must be at least ${min} characters`
    : null;

export const maxLength = (max) => (value, field) =>
  (typeof value === 'string' && value.length > max)
    ? `${field} must be at most ${max} characters`
    : null;
