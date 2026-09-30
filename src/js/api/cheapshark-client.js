import { config } from '../config.js';
import { ApiError, request } from './http.js';
import { browserStorage, createResponseCache } from './response-cache.js';

export const SHARK_CACHE = Object.freeze({
  search: { ttl: 24 * 60 * 60 * 1000, maxAge: 7 * 24 * 60 * 60 * 1000 },
  prices: { ttl: 30 * 60 * 1000, maxAge: 24 * 60 * 60 * 1000 },
  stores: { ttl: 24 * 60 * 60 * 1000, maxAge: 7 * 24 * 60 * 60 * 1000 },
});

// query входить у ключ: пошук Portal не може повернути кеш Portal 2.
function requestKey(path, query) {
  const params = new URLSearchParams();
  Object.entries(query).sort(([a], [b]) => a.localeCompare(b)).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  return path + '?' + params;
}

// Скасування одного споживача не скасовує спільний запит для інших карток.
function withSignal(promise, signal) {
  if (!signal) return promise;
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

/** ЄДИНІ ворота до CheapShark: кеш → спільна черга → HTTP.
 * Немає нескінченних retry. Після 429 зберігаємо паузу і зупиняємо ВСЮ чергу.
 * Web Locks узгоджує вкладки одного сайту; без підтримки працює черга цієї вкладки.
 */
export function createCheapsharkClient({ send = request, storage = browserStorage(), now = Date.now,
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), interval = 1200,
  locks = globalThis.navigator?.locks,
} = {}) {
  const cache = createResponseCache({ storage, now });
  const stateKey = cache.prefix + 'state';
  const inFlight = new Map();
  let tail = Promise.resolve();
  let state = { nextAt: 0, pausedUntil: 0, failures: 0, status: 0 };
  const stats = { network: 0, cacheHits: 0, shared: 0, stale: 0, blocked: 0, byEndpoint: {} };
  function readState() {
    try {
      const saved = JSON.parse(storage?.getItem(stateKey) || 'null');
      if (saved && Number.isFinite(saved.pausedUntil) && Number.isFinite(saved.nextAt)) state = saved;
    } catch { /* Користуємось станом у пам'яті. */ }
    return state;
  }
  function saveState(patch) {
    state = { ...readState(), ...patch };
    try { storage?.setItem(stateKey, JSON.stringify(state)); } catch { /* Пауза працює в пам'яті. */ }
  }
  function pauseError() {
    const saved = readState();
    const seconds = Math.max(1, Math.ceil((saved.pausedUntil - now()) / 1000));
    const message = saved.status === 429
      ? `CheapShark обмежив запити. Повторне оновлення можливе приблизно через ${seconds} с.`
      : `Оновлення цін тимчасово призупинене. Спробуй через ${seconds} с.`;
    return new ApiError(message, saved.status, { retryAfterMs: seconds * 1000 });
  }
  const keyFor = (path, query) => requestKey(path, query);
  function peek(path, query, policy, allowStale = false) {
    return cache.get(keyFor(path, query), { ...policy, allowStale });
  }
  async function perform(path, query, policy) {
    // Після очікування перевіряємо кеш знову: інша вкладка могла вже отримати дані.
    const fresh = peek(path, query, policy);
    if (fresh) { stats.cacheHits++; return fresh; }
    if (readState().pausedUntil > now()) { stats.blocked++; throw pauseError(); }
    const wait = Math.max(0, readState().nextAt - now());
    if (wait) await sleep(wait);
    if (readState().pausedUntil > now()) { stats.blocked++; throw pauseError(); }
    saveState({ nextAt: now() + interval });
    try {
      stats.network++;
      const category = path === 'games' ? (query.ids || query.id ? 'offers' : 'search') : path;
      stats.byEndpoint[category] = (stats.byEndpoint[category] || 0) + 1;
      saveState({ networkTotal: (readState().networkTotal || 0) + 1 });
      const data = await send(config.cheapshark.baseUrl, path, { query });
      if (!policy.validate(data)) throw new Error('CheapShark повернув неочікуваний формат.');
      const result = { data, updatedAt: now(), stale: false, source: 'network' };
      cache.set(keyFor(path, query), data, result.updatedAt);
      saveState({ failures: 0, pausedUntil: 0, status: 0 });
      return result;
    } catch (error) {
      const failures = (readState().failures || 0) + 1;
      // Retry-After враховуємо, якщо CORS дозволив браузеру прочитати заголовок.
      // Без нього 429 дає паузу щонайменше 5 хвилин; інші збої — 30 с з backoff.
      const delay = error.status === 429 ? Math.max(error.retryAfterMs || 0, 5 * 60 * 1000)
        : error.status === 403 ? 15 * 60 * 1000 : Math.min(5 * 60 * 1000, 30000 * 2 ** Math.min(failures - 1, 4));
      saveState({ pausedUntil: now() + delay, failures, status: error.status || 0 });
      throw error.status === 429 || error.status === 403 ? pauseError() : error;
    }
  }
  async function get(path, query = {}, { signal, ...policy } = {}) {
    signal?.throwIfAborted();
    const fresh = peek(path, query, policy);
    if (fresh) { stats.cacheHits++; return fresh; }
    const key = keyFor(path, query);
    let promise = inFlight.get(key);
    if (promise) stats.shared++;
    else {
      const task = () => locks?.request
        ? locks.request('playfinder:cheapshark:network', () => perform(path, query, policy))
        : perform(path, query, policy);
      promise = tail.then(task).catch(error => {
        const old = peek(path, query, policy, true);
        if (old) { stats.stale++; return { ...old, stale: true }; }
        throw error;
      });
      tail = promise.catch(() => {});
      inFlight.set(key, promise);
      promise.finally(() => inFlight.delete(key)).catch(() => {});
    }
    return withSignal(promise, signal);
  }
  return {
    get, peek,
    remember(path, query, result) { cache.set(keyFor(path, query), result.data, result.updatedAt); },
    diagnostics() { return { ...stats, byEndpoint: { ...stats.byEndpoint }, networkTotal: readState().networkTotal || 0, pausedUntil: readState().pausedUntil }; },
  };
}

export const cheapsharkClient = createCheapsharkClient();
