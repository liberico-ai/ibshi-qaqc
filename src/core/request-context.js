import { AsyncLocalStorage } from 'async_hooks';
import crypto from 'crypto';

export const requestContext = new AsyncLocalStorage();

/**
 * Lấy store hiện tại từ AsyncLocalStorage
 * @returns {{ traceId: string, [key: string]: any } | undefined}
 */
export function getRequestContext() {
  return requestContext.getStore();
}

/**
 * Tạo trace ID ngắn gọn (8 ký tự hex)
 */
export function generateTraceId() {
  return crypto.randomBytes(8).toString('hex');
}
