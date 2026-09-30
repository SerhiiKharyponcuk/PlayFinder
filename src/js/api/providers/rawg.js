import { config } from '../../config.js';
import { request } from '../http.js';
import { safeImage } from '../../utils/urls.js';
import { validReleaseDate, calendarToday } from '../../utils/release.js';

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
export function createRawgProvider({ apiKey = config.rawg.apiKey, send = request } = {}) {
  const call = (path, query, signal) => {
    if (!apiKey) throw new Error('Додай VITE_RAWG_API_KEY у .env.local та перезапусти Vite. Для GitHub Pages додай ключ у Secrets репозиторію.');
    return send(config.rawg.baseUrl, path, { query: { ...query, key: apiKey }, signal });
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
