import { cheapsharkProvider, parsePrice } from '../api/providers/cheapshark.js';
import { gameLinks } from './game-links.js';
import { titleKey, searchTitle, findGameMatch, fallbackSearchTitle, matchedProduct } from './game-matching.js';
// Зберігаємо попередні імпорти уроку. Сам нормалізатор тепер у game-matching.js.
export { titleKey, matchGame } from './game-matching.js';

/** ШЛЯХ ЦІНИ: games-service → resolveGame → CheapShark → summarize → cards.js.
 * Кеш і ліміти винесені в api/cheapshark-client.js. Цей файл обирає ТОВАР.
 * Deluxe/DLC/продовження не об'єднуємо з базовою грою за частиною назви.
 */
// Залишили навчальну функцію вчителя, але не використовуємо її для вибору ціни.
// Вона може допомогти згрупувати видання в UI; ототожнювати їхні ID не можна.
const EDITION_PATTERN = /\b(game of the year|goty|complete|premium|deluxe|ultimate|gold|definitive|enhanced|standard|special|remastered)( edition)?\b|\bdirectors cut\b/gi;
export function stripEdition(title = '') {
  return titleKey(title).replace(EDITION_PATTERN, '').trim().replace(/\s+/g, ' ');
}
export function createCardPrices(provider = cheapsharkProvider, links = gameLinks) {
  const resolving = new Map();
  async function search(title) {
    const key = searchTitle(title);
    let promise = resolving.get(key);
    if (!promise) {
      promise = provider.searchGames(title);
      resolving.set(key, promise);
      promise.finally(() => resolving.delete(key)).catch(() => {});
    }
    return promise;
  }
  async function resolveGame(game) {
    const known = game.providerIds?.cheapshark || links[game.providerIds?.rawg || game.id];
    if (known) return { ...game, providerIds: { ...game.providerIds, cheapshark: String(known) } };
    // Розділяємо запит пошуку і саме зіставлення: дві картки різних видань
    // можуть мати спільний пошук, але не можуть отримати спільний випадковий ID.
    const candidates = await search(game.title);
    let result = findGameMatch(game, candidates);
    const fallback = fallbackSearchTitle(game.title);
    if (result.status === 'unmatched' && fallback) {
      const more = await search(fallback);
      result = findGameMatch(game, [...candidates, ...more]);
    }
    const match = result.match;
    return match ? { ...game, ...matchedProduct(match.external), providerIds: { ...game.providerIds, cheapshark: String(match.gameID) } }
      : { ...game, priceStatus: 'unmatched', priceError: result.status === 'ambiguous'
        ? 'CheapShark має кілька товарів із цією назвою. Потрібна перевірена відповідність ID.'
        : 'Не знайдено відповідного повного товару: перевір назву, підзаголовок і видання.' };
  }
  function summarize(game, offers) {
    const valid = offers.filter(offer => offer.currency === 'USD' && parsePrice(offer.price) !== null);
    if (!valid.length) return { ...game, priceStatus: 'empty' };
    return {
      ...game, ...(valid[0].productTitle ? matchedProduct(valid[0].productTitle) : {}),
      priceStatus: 'ready', currency: 'USD',
      // Поточний мінімум потрібного товару. 0 — коректна безкоштовна пропозиція.
      price: Math.min(...valid.map(offer => Number(offer.price))),
      storeCount: new Set(valid.map(offer => offer.storeId || offer.store)).size,
      priceStale: valid.some(offer => offer.priceStale),
      priceUpdatedAt: Math.min(...valid.map(offer => offer.priceUpdatedAt || Date.now())),
    };
  }
  const failed = (game, error) => ({ ...game, priceStatus: error.status === 429 ? 'limited' : 'error', priceError: error.message });
  async function addPrices(games) {
    // Спочатку знаходимо всі ID видимих карток, потім отримуємо пропозиції пакетом.
    // Ми не завантажуємо весь каталог наперед — тільки ігри відкритої сторінки.
    const resolved = await Promise.all(games.map(async game => {
      // При повторному оновленні не залишаємо стару суму під новим статусом помилки.
      const base = { ...game };
      for (const key of ['price', 'priceStatus', 'priceError', 'priceStale', 'priceUpdatedAt', 'storeCount', 'priceProductTitle', 'priceEditionLabel']) delete base[key];
      try { return await resolveGame(base); } catch (error) { return failed(base, error); }
    }));
    const linked = resolved.filter(game => game.providerIds?.cheapshark && !game.priceStatus);
    let outcomes;
    if (provider.getOffersForGames) {
      try { outcomes = await provider.getOffersForGames(linked); }
      catch (error) { outcomes = new Map(linked.map(game => [game.id, error])); }
    } else {
      outcomes = new Map(await Promise.all(linked.map(async game => {
        try { return [game.id, await provider.getOffers(game)]; } catch (error) { return [game.id, error]; }
      })));
    }
    return resolved.map(game => {
      if (game.priceStatus) return game;
      const result = outcomes.get(game.id);
      return result instanceof Error ? failed(game, result) : summarize(game, result || []);
    });
  }
  const enrich = async game => (await addPrices([game]))[0];
  enrich.many = addPrices;
  return enrich;
}
export const addCardPrice = createCardPrices();
export const addCardPrices = games => addCardPrice.many(games);
