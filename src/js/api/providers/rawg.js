import { config } from '../../config.js';
import { request } from '../http.js';
import { safeImage } from '../../utils/urls.js';
import { validReleaseDate, calendarToday } from '../../utils/release.js';
import { browserStorage, createResponseCache } from '../response-cache.js';

// Це кеш описів, не цін. Ключ RAWG не записується в localStorage.
export const RAWG_CACHE = Object.freeze({ list: 10 * 60 * 1000, detail: 60 * 60 * 1000 });
const GAME_FIELDS = ['id', 'name', 'background_image', 'platforms', 'released', 'tba', 'genres', 'developers', 'publishers', 'rating', 'ratings_count', 'description_raw', 'website'];
const publicGame = item => Object.fromEntries(GAME_FIELDS.filter(key => Object.hasOwn(item, key)).map(key => [key, item[key]]));
export function createRawgCache(storage = browserStorage()) {
  // Прибираємо лише наш пробний v1-кеш із сирими pagination URL. У v2 next
  // зберігається як boolean, тому ключ із URL більше не записується в сховище.
  try {
    const oldKeys = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith('playfinder:rawg:v1:')) oldKeys.push(key);
    }
    oldKeys.forEach(key => storage.removeItem(key));
  } catch { /* Без localStorage залишається Map. */ }
  return createResponseCache({ storage, prefix: 'playfinder:rawg:v2:', maxEntries: 40 });
}

/** RAWG name/background_image → наші title/image. RAWG ID не є CheapShark ID. */
export function normalizeGame(item) {
  const names = items => Array.isArray(items) ? items.map(entry => entry?.name).filter(name => typeof name === 'string' && name.trim()) : [];
  return {
    id: String(item.id), title: item.name || 'Без назви',
    image: safeImage(item.background_image),
    platforms: Array.isArray(item.platforms) ? item.platforms.map(entry => entry?.platform?.name).filter(Boolean) : [],
    // Ці поля RAWG вже повертає у списку. tba = To Be Announced, дату не оголошено.
    releaseDate: validReleaseDate(item.released), releaseTba: item.tba === true,
    genres: names(item.genres), developers: names(item.developers), publishers: names(item.publishers),
    rating: Number.isFinite(item.rating) && item.rating >= 0 && item.rating <= 5 ? item.rating : null,
    ratingsCount: Number.isInteger(item.ratings_count) && item.ratings_count >= 0 ? item.ratings_count : 0,
    // Докладний endpoint getGame дає description_raw. HTML description не вставляємо.
    description: typeof item.description_raw === 'string' ? item.description_raw : '',
    website: typeof item.website === 'string' ? item.website : '',
    providerIds: { rawg: String(item.id) },
  };
}

// Фабрика дозволяє тестувати запити без справжнього ключа й без мережі.
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
    // Скасовані запити не об'єднуємо: один AbortSignal не має зупинити іншого учня/споживача.
    if (!signal && inFlight.has(key)) return inFlight.get(key);
    const pending = send(config.rawg.baseUrl, path, { query: { ...query, key: apiKey }, signal }).then(data => {
      if (!validate(data)) return data;
      // RAWG next/previous — URL, які можуть містити API-ключ! Для пагінації
      // нам потрібен тільки факт наступної сторінки. Зберігаємо вибрані поля.
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
    async getGames({ query = '', sort = 'popular', page = 1, pageSize = config.pageSize } = {}, { signal } = {}) {
      // Це переклад наших параметрів у назви RAWG. Непідтримувані UI-фільтри не вгадуємо.
      const ordering = { popular: '-added', rating: '-rating', release: '-released' }[sort] || '-added';
      const params = { search: query, ordering, page, page_size: pageSize };
      if (sort === 'release') params.dates = '1970-01-01,' + calendarToday();
      const data = await call('games', params, signal);
      if (!Array.isArray(data.results)) throw new Error('RAWG повернув неочікуваний формат каталогу.');
      // Завжди повертаємо однаковий контракт: { games, total, hasNext }.
      return { games: data.results.map(normalizeGame), total: data.count || 0, hasNext: Boolean(data.next) };
    },
    async getGame(id, { signal } = {}) {
      return normalizeGame(await call('games/' + encodeURIComponent(id), {}, signal));
    },
  };
}
export const rawgProvider = createRawgProvider();
