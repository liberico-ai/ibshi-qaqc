import { offlineQueue } from '@/core/offline-queue.js';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function apiFetch(url, options = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body && typeof options.body === 'string' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const method = (options.method || 'GET').toUpperCase();

  try {
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401 && token) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.reload();
    }
    return res;
  } catch (err) {
    // Network error — queue mutating requests for offline sync
    if (MUTATING.has(method) && err instanceof TypeError && typeof indexedDB !== 'undefined') {
      const clientTimestamp = new Date().toISOString();
      await offlineQueue.enqueue({ url, method, headers, body: options.body ?? null, clientTimestamp });
      // Return a synthetic "queued" response (status 202) so callers know it was accepted
      return new Response(
        JSON.stringify({ queued: true, offline: true, message: 'Đã lưu vào hàng đợi offline' }),
        { status: 202, headers: { 'Content-Type': 'application/json' } }
      );
    }
    throw err;
  }
}
