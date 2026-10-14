import { SEARCH_GAMES_LIST } from '../data/search-games.js';
import { createSearchIndex } from '../services/search-index.js';

const index = createSearchIndex(SEARCH_GAMES_LIST);
self.addEventListener('message', event => {
  const { id, method, query } = event.data || {};
  if (!Number.isSafeInteger(id) || !['find', 'resolve'].includes(method) || typeof query !== 'string') return;
  try { self.postMessage({ id, result: index[method](query) }); }
  catch { self.postMessage({ id, error: true }); }
});
self.postMessage({ ready: true });
