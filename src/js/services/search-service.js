import { rawgProvider } from '../api/providers/rawg.js';
import { createResponseCache } from '../api/response-cache.js';
import { normalizeSearchQuery, searchKey } from '../features/search-query.js';
import { createSearchIndex } from './search-index.js';
import { loadSearchIndex } from './search-worker-client.js';

const TTL = 10 * 60 * 1000;
const validResult = value => Array.isArray(value?.games) && value.games.every(game => game && /^[\w-]+$/.test(String(game.id)) && typeof game.title === 'string');

function subscribe(entry, signal) {
  signal?.throwIfAborted();
  entry.users++;
  return new Promise((resolve, reject) => {
    let finished = false;
    const finish = (callback, value) => {
      if (finished) return;
      finished = true;
      signal?.removeEventListener('abort', abort);
      entry.users--;
      if (!entry.users && !entry.done) entry.controller.abort();
      callback(value);
    };
    const abort = () => finish(reject, signal.reason);
    signal?.addEventListener('abort', abort, { once: true });
    entry.promise.then(value => finish(resolve, value), error => finish(reject, error));
  });
}

export function createSearchService({
  loadLocal = loadSearchIndex,
  provider = rawgProvider,
  cache = createResponseCache({ prefix: 'playfinder:search:v1:', maxEntries: 80 }),
  now = Date.now,
} = {}) {
  let localIndex;
  const pending = new Map();
  async function index() {
    if (!localIndex) localIndex = Promise.resolve().then(loadLocal).then(value => typeof value?.find === 'function' && !Array.isArray(value) ? value : createSearchIndex(value))
      .catch(error => { localIndex = null; throw error; });
    return localIndex;
  }
  async function suggest(value, { signal } = {}) {
    const query = normalizeSearchQuery(value);
    signal?.throwIfAborted();
    if (query.length < 2 || !searchKey(query)) return { games: [], source: 'local' };
    try {
      const local = await index();
      signal?.throwIfAborted();
      const games = await local.find(query);
      signal?.throwIfAborted();
      if (games.length) return { games, source: 'local', resolvedQuery: await local.resolve(query) };
    } catch (error) { if (signal?.aborted) throw signal.reason; }
    if (query.length < 3) return { games: [], source: 'local', refine: true };
    const key = 'query:' + searchKey(query);
    const saved = cache.get(key, { ttl: TTL, validate: validResult });
    if (saved) return { ...saved.data, source: 'rawg' };
    const pause = cache.get('pause', { ttl: 24 * 60 * 60 * 1000, validate: value => Number.isFinite(value?.until) });
    if (pause?.data.until > now()) return { games: [], unavailable: true };
    let entry = pending.get(key);
    if (!entry || entry.controller.signal.aborted) {
      entry = { users: 0, done: false, controller: new AbortController() };
      entry.promise = Promise.resolve().then(() => provider.getGames({ query, searchRelevance: true, pageSize: 8 }, { signal: entry.controller.signal }))
        .then(result => {
          entry.controller.signal.throwIfAborted();
          const games = createSearchIndex(result.games).find(query);
          const payload = { games };
          cache.set(key, payload);
          return { ...payload, source: 'rawg' };
        }).catch(error => {
          if (entry.controller.signal.aborted) throw entry.controller.signal.reason;
          const pauseMs = error.status === 429 ? Math.max(error.retryAfterMs || 0, 5 * 60 * 1000) : 30_000;
          cache.set('pause', { until: now() + pauseMs });
          return { games: [], unavailable: true };
        }).finally(() => {
          entry.done = true;
          if (pending.get(key) === entry) pending.delete(key);
        });
      pending.set(key, entry);
    }
    return subscribe(entry, signal);
  }
  async function resolveQuery(value) {
    const query = normalizeSearchQuery(value);
    if (query.length < 2) return query;
    try { return await (await index()).resolve(query); }
    catch { return query; }
  }
  return { suggest, resolveQuery };
}
export const searchService = createSearchService();
