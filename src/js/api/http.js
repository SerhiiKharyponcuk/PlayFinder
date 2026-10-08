import { config } from '../config.js';

export class ApiError extends Error {
  constructor(message, status = 0, { retryAfterMs = 0 } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

export async function request(baseUrl, path, { query = {}, signal, timeout = config.requestTimeout, ...options } = {}) {
  const url = new URL(baseUrl.replace(/\/$/, '') + '/' + path.replace(/^\//, ''), globalThis.location?.origin || 'http://localhost');
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  if (signal?.aborted) abort();
  else signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => controller.abort(new DOMException('Час очікування вичерпано', 'TimeoutError')), timeout);
  try {
    const headers = new Headers(options.headers);
    if (!headers.has('Accept')) headers.set('Accept', 'application/json');
    const response = await fetch(url, { ...options, headers, signal: controller.signal });
    if (!response.ok) {
      const retryAfter = response.headers.get('Retry-After');
      const seconds = retryAfter === null ? NaN : Number(retryAfter);
      const retryAfterMs = Number.isFinite(seconds) ? Math.max(0, seconds * 1000)
        : Math.max(0, Date.parse(retryAfter) - Date.now()) || 0;
      throw new ApiError('Помилка API: ' + response.status, response.status, { retryAfterMs });
    }
    if (response.status === 204) return null;
    return await response.json();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
