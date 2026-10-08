import { config } from '../../config.js';
import { request } from '../http.js';
import { safeImage } from '../../utils/urls.js';
import { validReleaseDate } from '../../utils/release.js';
import { browserStorage, createResponseCache } from '../response-cache.js';
import { RAWG_GENRE_IDS, RAWG_TAG_IDS, RAWG_PLATFORM_IDS, RAWG_STORE_IDS, normalizeGenre,
  normalizeSort, normalizeYear, normalizeChoices, releaseDates } from '../rawg-filters.js';

export const RAWG_CACHE = Object.freeze({ list: 10 * 60 * 1000, detail: 60 * 60 * 1000 });
const GAME_FIELDS = ['id', 'name', 'background_image', 'platforms', 'released', 'tba', 'genres', 'developers', 'publishers', 'rating', 'ratings_count', 'description_raw', 'website'];
const publicGame = item => Object.fromEntries(GAME_FIELDS.filter(key => Object.hasOwn(item, key)).map(key => [key, item[key]]));
export function createRawgCache(storage = browserStorage()) {

  try {
    const oldKeys = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith('playfinder:rawg:v1:')) oldKeys.push(key);
    }
    oldKeys.forEach(key => storage.removeItem(key));
  } catch {                                         }
  return createResponseCache({ storage, prefix: 'playfinder:rawg:v2:', maxEntries: 40 });
}

export function normalizeGame(item) {
  const names = items => Array.isArray(items) ? items.map(entry => entry?.name).filter(name => typeof name === 'string' && name.trim()) : [];
  return {
    id: String(item.id), title: item.name || 'Без назви',
    image: safeImage(item.background_image),
    platforms: Array.isArray(item.platforms) ? item.platforms.map(entry => entry?.platform?.name).filter(Boolean) : [],

    releaseDate: validReleaseDate(item.released), releaseTba: item.tba === true,
    genres: names(item.genres), developers: names(item.developers), publishers: names(item.publishers),
    rating: Number.isFinite(item.rating) && item.rating >= 0 && item.rating <= 5 ? item.rating : null,
    ratingsCount: Number.isInteger(item.ratings_count) && item.ratings_count >= 0 ? item.ratings_count : 0,

    description: typeof item.description_raw === 'string' ? item.description_raw : '',
    website: typeof item.website === 'string' ? item.website : '',
    providerIds: { rawg: String(item.id) },
  };
}

export function createRawgProvider({ apiKey = config.rawg.apiKey, send = request,
  cache = createRawgCache(),
} = {}) {
  const inFlight = new Map();
  const call = async (path, query, signal) => {
    if (!apiKey) throw new Error('Додай VITE_RAWG_API_KEY у .env.local та перезапусти Vite. Для GitHub Pages додай ключ у Secrets репозиторію.');
    signal?.throwIfAborted();
    const key = path + '?' + new URLSearchParams(Object.entries(query).sort(([a], [b]) => a.localeCompare(b)));
    const ttl = path === 'games' ? RAWG_CACHE.list : RAWG_CACHE.detail;
    const validate = data => path === 'games' ? Array.isArray(data?.results) : data && typeof data.name === 'string';
    const saved = cache.get(key, { ttl, validate });
    if (saved) return saved.data;

    if (!signal && inFlight.has(key)) return inFlight.get(key);
    const pending = send(config.rawg.baseUrl, path, { query: { ...query, key: apiKey }, signal }).then(data => {
      if (!validate(data)) return data;

      const publicData = path === 'games'
        ? { results: data.results.map(publicGame), count: data.count, next: Boolean(data.next) }
        : publicGame(data);
      cache.set(key, publicData);
      return publicData;
    });
    if (!signal) {
      inFlight.set(key, pending);
      pending.finally(() => inFlight.delete(key)).catch(() => {});
    }
    return pending;
  };
  return {
    id: 'rawg',
    async getGames({ query = '', sort = 'popular', genre = '', year = '', platform = '', store = '',
      release = '', searchRelevance = false, page = 1, pageSize = config.pageSize } = {}, { signal } = {}) {
      const normalizedSort = normalizeSort(sort);
      const ordering = { popular: '-added', rating: '-rating', release: '-released' }[normalizedSort] || '-added';
      const size = Number.isInteger(Number(pageSize)) && Number(pageSize) > 0 ? Math.min(40, Number(pageSize)) : config.pageSize;
      const params = { search: query, ordering, page, page_size: size };
      if (query) params.search_precise = true;
      if (query && searchRelevance) delete params.ordering;
      const ids = (values, mapping) => values.split(',').filter(key => Object.hasOwn(mapping, key)).map(key => mapping[key]).join(',');
      const genres = normalizeGenre(genre);
      if (ids(genres, RAWG_GENRE_IDS)) params.genres = genres.includes(',') ? ids(genres, RAWG_GENRE_IDS) : Number(ids(genres, RAWG_GENRE_IDS));
      if (ids(genres, RAWG_TAG_IDS)) params.tags = ids(genres, RAWG_TAG_IDS);
      const platforms = ids(normalizeChoices(platform, RAWG_PLATFORM_IDS), RAWG_PLATFORM_IDS);
      const stores = ids(normalizeChoices(store, RAWG_STORE_IDS), RAWG_STORE_IDS);
      if (platforms) params.parent_platforms = platforms;
      if (stores) params.stores = stores;
      const dates = releaseDates({ year: normalizeYear(year), sort: normalizedSort,
        release: ['recent', 'upcoming'].includes(release) ? release : '' });
      if (dates.empty) return { games: [], total: 0, hasNext: false };
      if (dates.dates) params.dates = dates.dates;
      const data = await call('games', params, signal);
      if (!Array.isArray(data.results)) throw new Error('RAWG повернув неочікуваний формат каталогу.');

      return { games: data.results.map(normalizeGame), total: data.count || 0, hasNext: Boolean(data.next) };
    },
    async getGame(id, { signal } = {}) {
      return normalizeGame(await call('games/' + encodeURIComponent(id), {}, signal));
    },
  };
}
export const rawgProvider = createRawgProvider();
