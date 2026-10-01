import { cheapsharkClient, SHARK_CACHE } from '../cheapshark-client.js';
import { safeImage } from '../../utils/urls.js';
import { searchTitle, titleKey } from '../../services/game-matching.js';

// CheapShark дає PC-ціни в USD. Порожнє значення — НЕ безкоштовна гра.
export function parsePrice(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (String(value).trim() === '') return null;
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : null;
}
export function dealUrl(id) {
  // API іноді вже кодує dealID. Декодуємо один раз, щоб не отримати %253D.
  let decoded = String(id);
  try { decoded = decodeURIComponent(decoded); } catch { /* Зберігаємо початковий ID. */ }
  return 'https://www.cheapshark.com/redirect?dealID=' + encodeURIComponent(decoded);
}
const isList = data => Array.isArray(data);
const isLookup = data => data && typeof data === 'object' && Array.isArray(data.deals) && typeof data.info?.title === 'string';
const pricePolicy = { ...SHARK_CACHE.prices, validate: isLookup };
const isBatch = data => data && typeof data === 'object' && !Array.isArray(data);

/** Усі HTTP-виклики проходять через cheapshark-client.js, зокрема пошук і права колонка.
 * Пакет до 25 ID повертає пропозиції всіх цих ігор; кешуємо також кожну окремо.
 * Тому перехід головна → каталог → деталі використовує вже отримані ціни.
 */
export function createCheapsharkProvider(client = cheapsharkClient) {
  async function lookups(ids, signal) {
    const result = new Map();
    const missing = [];
    for (const id of new Set(ids)) {
      const cached = client.peek('games', { id }, pricePolicy);
      if (cached) result.set(id, cached);
      else missing.push(id);
    }
    for (let offset = 0; offset < missing.length; offset += 25) {
      signal?.throwIfAborted();
      const batch = missing.slice(offset, offset + 25).sort();
      try {
        const response = await client.get('games', { ids: batch.join(',') }, { ...SHARK_CACHE.prices, validate: isBatch, signal });
        for (const id of batch) {
          if (!isLookup(response.data[id])) {
            result.set(id, new Error('CheapShark не повернув пропозиції вибраної гри.'));
            continue;
          }
          const item = { ...response, data: response.data[id] };
          // Не продовжуємо вік кешу, якщо API недоступний і дані вже застарілі.
          client.remember('games', { id }, item);
          result.set(id, item);
        }
      } catch (error) {
        if (signal?.aborted) throw error;
        for (const id of batch) {
          const old = client.peek('games', { id }, pricePolicy, true);
          result.set(id, old ? { ...old, stale: true } : error);
        }
      }
    }
    return result;
  }
  function normalizeOffers(game, lookup, stores) {
    // providerIds.cheapshark — ID обраного товару; він не дорівнює RAWG ID.
    // Не використовуємо історичний cheapestPriceEver як поточну ціну.
    const seen = new Set();
    return lookup.data.deals.filter(deal => {
      if (!deal.dealID || parsePrice(deal.price) === null || seen.has(deal.dealID)) return false;
      const store = stores.find(item => String(item.storeID) === String(deal.storeID));
      if (store?.isActive === 0 || store?.isActive === '0') return false;
      seen.add(deal.dealID); return true;
    }).map(deal => ({
      id: deal.dealID, gameId: game.id, storeId: String(deal.storeID),
      productTitle: lookup.data.info.title,
      store: stores.find(store => store.storeID === String(deal.storeID))?.storeName || 'Магазин ' + deal.storeID,
      price: parsePrice(deal.price), currency: 'USD',
      // API не підтверджує видання/регіон; unknown не означає Standard Edition.
      edition: 'unknown', region: 'unknown', url: dealUrl(deal.dealID),
      priceUpdatedAt: lookup.updatedAt, priceStale: lookup.stale,
    })).sort((a, b) => a.price - b.price);
  }
  const provider = {
    id: 'cheapshark', enabled: true,
    diagnostics: () => client.diagnostics(),
    async getDeals({ limit = 5, signal } = {}) {
      // API повертає ПРОПОЗИЦІЇ магазинів, тому одна гра могла займати 3 рядки.
      // Одна сторінка на 60 пропозицій — один HTTP-запит; для кожного gameID
      // залишаємо найдешевшу. Назви різних видань при цьому не об'єднуємо.
      const response = await client.get('deals', { pageSize: 60 }, { ...SHARK_CACHE.prices, validate: isList, signal });
      const unique = new Map();
      for (const item of response.data) {
        const price = parsePrice(item.salePrice);
        if (!item.dealID || price === null || !item.title) continue;
        const key = item.gameID ? 'id:' + item.gameID : 'title:' + titleKey(item.title);
        if (!unique.has(key) || price < parsePrice(unique.get(key).salePrice)) unique.set(key, item);
      }
      return [...unique.values()].slice(0, Math.max(0, limit)).map(item => ({
        id: item.dealID, title: item.title, image: safeImage(item.thumb),
        price: parsePrice(item.salePrice), currency: 'USD', url: dealUrl(item.dealID),
        priceUpdatedAt: response.updatedAt, priceStale: response.stale,
      }));
    },
    async searchGames(title, { signal } = {}) {
      // Результат — масив кандидатів, кожен має external (назва) і gameID.
      // Кешуємо також порожній масив, щоб F5 не повторював невдалий пошук.
      const query = searchTitle(title);
      if (!query) return [];
      const response = await client.get('games', { title: query, limit: 60 }, { ...SHARK_CACHE.search, validate: isList, signal });
      return response.data;
    },
    async getOffersForGames(games, { signal, currency = 'USD' } = {}) {
      if (currency !== 'USD') throw new Error('CheapShark надає ціни лише у USD.');
      const outcomes = new Map();
      const linked = games.filter(game => {
        if (/^\d+$/.test(String(game.providerIds?.cheapshark || ''))) return true;
        outcomes.set(game.id, new Error('Спочатку обери відповідну гру CheapShark та збережи її gameID у providerIds.cheapshark.'));
        return false;
      });
      if (!linked.length) return outcomes;
      const [data, storesResponse] = await Promise.all([
        lookups(linked.map(game => String(game.providerIds.cheapshark)), signal),
        // Навіть якщо список назв магазинів недоступний, не прибираємо отримані ціни.
        client.get('stores', {}, { ...SHARK_CACHE.stores, validate: isList, signal }).catch(() => ({ data: [] })),
      ]);
      signal?.throwIfAborted();
      for (const game of linked) {
        const response = data.get(String(game.providerIds.cheapshark));
        outcomes.set(game.id, response instanceof Error ? response : normalizeOffers(game, response, storesResponse.data));
      }
      return outcomes;
    },
    async getOffers(game, options = {}) {
      const outcome = (await provider.getOffersForGames([game], options)).get(game.id);
      if (outcome instanceof Error) throw outcome;
      return outcome;
    },
  };
  return provider;
}
export const cheapsharkProvider = createCheapsharkProvider();
