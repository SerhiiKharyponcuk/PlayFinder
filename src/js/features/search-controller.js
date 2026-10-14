import { normalizeSearchQuery } from './search-query.js';

export function createSearchController({ search, onState, delay = 300, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let timer, request, revision = 0;
  const cancel = () => {
    revision++;
    clearTimer(timer);
    request?.abort();
    request = null;
  };
  const update = (value, { immediate = false } = {}) => {
    cancel();
    const query = normalizeSearchQuery(value), current = revision;
    if (query.length < 2) { onState({ status: 'idle', query, games: [] }); return; }
    onState({ status: 'loading', query, games: [] });
    timer = setTimer(async () => {
      const controller = new AbortController(); request = controller;
      try {
        const result = await search(query, { signal: controller.signal });
        if (current === revision && !controller.signal.aborted) onState({ ...result, status: 'ready', query });
      } catch (error) {
        if (current === revision && !controller.signal.aborted) onState({ status: 'error', query, games: [] });
      }
    }, immediate ? 0 : delay);
  };
  return { update, cancel };
}
