import { createLogger } from './logger.js';

const log = createLogger('error-handler');

/**
 * Custom operational error with HTTP status code.
 * Thrown in controllers/services to trigger consistent error responses.
 */
export class AppError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

/**
 * Wraps async route handlers to forward errors to Express error middleware.
 * Eliminates the need for try/catch in every controller method.
 * 
 * Usage: router.get('/path', asyncHandler(Controller.method))
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Centralized Express error-handling middleware.
 * Must be registered AFTER all routes in server.js.
 * 
 * Handles:
 * - AppError (operational) → structured JSON response
 * - Postgres unique constraint (23505) → 400
 * - Unknown errors → 500 with generic message
 */
export function errorMiddleware(err, req, res, _next) {
  // Already sent headers — delegate to Express default
  if (res.headersSent) return _next(err);

  // Operational errors (thrown by us)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details && { details: err.details }),
    });
  }

  // Postgres: unique constraint violation
  if (err.code === '23505') {
    const field = err.constraint || 'field';
    return res.status(409).json({
      error: `Duplicate value: ${field} already exists`,
    });
  }

  // Postgres: foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({
      error: 'Referenced record does not exist',
    });
  }

  // Unexpected / programmer errors
  log.error(err, 'Unhandled error');
  res.status(500).json({ error: 'Internal Server Error' });
}
