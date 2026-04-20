import pino from 'pino';
import { getRequestContext } from './request-context.js';

const isProd = process.env.NODE_ENV === 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  mixin() {
    const ctx = getRequestContext();
    if (ctx?.traceId) {
      return { traceId: ctx.traceId };
    }
    return {};
  },
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
});

/**
 * Tạo child logger cho từng module/component
 * @param {string} name - Tên module (ví dụ: 'server', 'backend-loader', 'system')
 */
export function createLogger(name) {
  return logger.child({ module: name });
}

const VALID_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'];

/**
 * Thay đổi log level tại runtime (không cần restart server)
 * @param {string} level - Một trong: trace, debug, info, warn, error, fatal, silent
 */
export function setLogLevel(level) {
  if (!VALID_LEVELS.includes(level)) return;
  logger.level = level;
}

export default logger;
