import { ZodError } from 'zod';
import { AppError } from './errors.js';
import { createLogger } from './logger.js';

const log = createLogger('validate');

const SUSPICIOUS_RE = /DROP\s+TABLE|SELECT\s+\*\s+FROM|<script|UNION\s+SELECT|INSERT\s+INTO\s+\w|DELETE\s+FROM/i;

/**
 * Zod-based validation middleware.
 * Sets req.validated = parsed data; rejects with RFC 7807 400 on failure.
 */
export function validateSchema(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const raw = JSON.stringify(req.body ?? '');
      if (SUSPICIOUS_RE.test(raw)) {
        log.warn({ userId: req.user?.id, ip: req.ip, body: raw.slice(0, 500) }, 'suspicious_input');
      }
      const errors = result.error.issues.map(i => ({
        field: i.path.join('.'),
        msg: i.message,
      }));
      return res.status(400).json({
        type: '/errors/validation',
        title: 'Validation Failed',
        status: 400,
        errors,
      });
    }
    req.validated = result.data;
    next();
  };
}

/**
 * Legacy rules-based validation middleware (kept for system routes).
 * Usage: validate({ username: [required, isString], password: [required, minLength(6)] })
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
          break;
        }
      }
    }

    if (errors.length) {
      throw new AppError(400, 'Validation failed', errors);
    }

    next();
  };
}

// ── Legacy validator helpers ──────────────────────────────────────

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
