import { FILTER_LABELS, normalizeChoices, normalizeGenre, normalizeSort, normalizeYear } from '../api/rawg-filters.js';

export const FILTER_DEFAULTS = Object.freeze({ query: '', sort: 'popular', genre: '', platform: '', store: '',
  year: '', release: '', minPrice: null, maxPrice: null, page: 1, pageSize: 12, view: 'grid' });
const KEYS = { query: 'q', sort: 'sort', genre: 'genre', platform: 'platform', store: 'store', year: 'year',
  release: 'release', minPrice: 'min', maxPrice: 'max', page: 'page', pageSize: 'size', view: 'view' };
function price(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 100000 ? Math.round(number * 100) / 100 : null;
}
export function normalizeFilters(values = {}) {
  const page = Number(values.page);
  let minPrice = price(values.minPrice), maxPrice = price(values.maxPrice);
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) [minPrice, maxPrice] = [maxPrice, minPrice];
  return { query: String(values.query || '').trim().slice(0, 200), sort: normalizeSort(values.sort),
    genre: normalizeGenre(values.genre), platform: normalizeChoices(values.platform, FILTER_LABELS.platform),
    store: normalizeChoices(values.store, FILTER_LABELS.store), year: normalizeYear(values.year),
    release: ['recent', 'upcoming'].includes(values.release) ? values.release : '', minPrice, maxPrice,
    page: Number.isSafeInteger(page) && page > 0 && page <= 100000 ? page : 1,
    pageSize: Number(values.pageSize) === 48 ? 40 : [12, 24, 36, 40].includes(Number(values.pageSize)) ? Number(values.pageSize) : 12,
    view: values.view === 'list' ? 'list' : 'grid' };
}
export function readFilters(search = globalThis.location?.search || '') {
  const params = new URLSearchParams(search);
  return normalizeFilters(Object.fromEntries(Object.entries(KEYS).map(([field, key]) => [field, params.get(key)])));
}
export function updateFilterSearch(search, changes) {
  const old = readFilters(search);
  const state = normalizeFilters({ ...old, ...Object.fromEntries(Object.entries(changes).filter(([key]) => Object.hasOwn(KEYS, key))) });
  if (!Object.hasOwn(changes, 'page') && Object.keys(changes).some(key => Object.hasOwn(KEYS, key) && key !== 'view')) state.page = 1;
  const params = new URLSearchParams();
  for (const [field, key] of Object.entries(KEYS)) if (state[field] !== FILTER_DEFAULTS[field]) params.set(key, state[field]);
  return params.size ? '?' + params.toString() : '';
}
export function hasPriceFilter(filters) { return filters.minPrice !== null || filters.maxPrice !== null; }
export function selectCatalogGames(games, filters) {
  if (games.some(game => game.priceStatus === 'loading')) return games;
  const selected = hasPriceFilter(filters) ? games.filter(game => Number.isFinite(game.price) &&
    game.price >= (filters.minPrice ?? 0) && game.price <= (filters.maxPrice ?? Infinity)) : [...games];
  if (filters.sort.startsWith('price-')) {
    const direction = filters.sort === 'price-low' ? 1 : -1;
    selected.sort((a, b) => {
      const aValid = Number.isFinite(a.price), bValid = Number.isFinite(b.price);
      if (aValid !== bValid) return aValid ? -1 : 1;
      return aValid ? direction * (a.price - b.price) : 0;
    });
  }
  return selected;
}
