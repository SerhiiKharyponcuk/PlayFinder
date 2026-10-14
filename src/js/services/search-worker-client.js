import { createSearchIndex } from './search-index.js';

export async function loadSearchIndex() {
  let fallbackIndex;
  const fallback = () => fallbackIndex ||= import('../data/search-games.js').then(module => createSearchIndex(module.SEARCH_GAMES_LIST));
  if (typeof Worker === 'undefined') return fallback();
  let worker;
  try { worker = new Worker(new URL('../workers/search-worker.js', import.meta.url), { type: 'module' }); }
  catch { return fallback(); }
  let sequence = 0, failed = false, readyResolve;
  const pending = new Map();
  const ready = new Promise(resolve => { readyResolve = resolve; });
  const fail = () => {
    if (failed) return;
    failed = true; worker.terminate(); readyResolve(false);
    for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(new Error('Search worker unavailable')); }
    pending.clear();
  };
  const startupTimer = setTimeout(fail, 10_000);
  worker.addEventListener('error', event => { event.preventDefault(); clearTimeout(startupTimer); fail(); });
  worker.addEventListener('messageerror', () => { clearTimeout(startupTimer); fail(); });
  worker.addEventListener('message', event => {
    if (event.data?.ready) { clearTimeout(startupTimer); readyResolve(true); return; }
    const entry = pending.get(event.data?.id);
    if (!entry) return;
    pending.delete(event.data.id); clearTimeout(entry.timer);
    if (event.data.error) entry.reject(new Error('Search worker unavailable'));
    else entry.resolve(event.data.result);
  });
  if (!await ready) return fallback();
  async function invoke(method, query) {
    if (!failed) {
      try {
        return await new Promise((resolve, reject) => {
          const id = ++sequence, timer = setTimeout(() => { pending.delete(id); fail(); reject(new Error('Search worker timed out')); }, 5000);
          pending.set(id, { resolve, reject, timer }); worker.postMessage({ id, method, query });
        });
      } catch { fail(); }
    }
    return (await fallback())[method](query);
  }
  return { find: query => invoke('find', query), resolve: query => invoke('resolve', query) };
}
