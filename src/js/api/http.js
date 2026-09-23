/**
 * НИЗЬКОРІВНЕВИЙ HTTP-КЛІЄНТ. Для виведення карток цей файл змінювати не потрібно.
 * request(baseUrl, path, { query }) будує URL, робить fetch та читає JSON.
 * Наприклад query: { page: 2 } додає ?page=2. Ключ можна передати окремим query-полем.
 * Успіх → повертає JavaScript-об'єкт; HTTP-помилка → throw, який ловить catch сторінки.
 * await request(...) не додає нічого в DOM: це лише отримання даних.
 */

import { config } from '../config.js';

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/** JSON-клієнт. Параметри запиту, AbortSignal та заголовки передає викликач. */
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
    if (!response.ok) throw new ApiError('Помилка API: ' + response.status, response.status);
    if (response.status === 204) return null;
    return await response.json();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
