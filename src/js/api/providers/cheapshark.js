import { config } from '../../config.js';
import { request } from '../http.js';
import { safeImage } from '../../utils/urls.js';

// Ціни CheapShark — USD. Не підставляй сюди EUR без окремої конвертації.
export function parsePrice(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (String(value).trim() === '') return null;
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : null;
}
export function dealUrl(id) {
  return 'https://www.cheapshark.com/redirect?dealID=' + encodeURIComponent(id);
}
export const cheapsharkProvider = {
  id: 'cheapshark', enabled: true,
  async getDeals({ limit = 5, signal } = {}) {
    const data = await request(config.cheapshark.baseUrl, 'deals', { query: { pageSize: limit }, signal });
    if (!Array.isArray(data)) throw new Error('CheapShark повернув неочікуваний формат.');
    return data.filter(item => item.dealID && parsePrice(item.salePrice) !== null).map(item => ({
      id: item.dealID, title: item.title, image: safeImage(item.thumb),
      price: parsePrice(item.salePrice), currency: 'USD', url: dealUrl(item.dealID),
    }));
  },
  // Пошук повертає КАНДИДАТІВ: назва не гарантує ту саму гру/видання.
  searchGames: (title, { signal } = {}) => request(config.cheapshark.baseUrl, 'games', { query: { title, limit: 10 }, signal }),
  async getOffers(game, { signal, currency = 'USD' } = {}) {
    if (currency !== 'USD') throw new Error('CheapShark надає ціни лише у USD.');
    const id = game.providerIds?.cheapshark;
    if (!id) throw new Error('Спочатку обери відповідну гру CheapShark та збережи її gameID у providerIds.cheapshark.');
    const [data, stores] = await Promise.all([
      request(config.cheapshark.baseUrl, 'games', { query: { id }, signal }),
      request(config.cheapshark.baseUrl, 'stores', { signal }),
    ]);
    if (!Array.isArray(data.deals) || !Array.isArray(stores)) throw new Error('Некоректна відповідь CheapShark.');
    return data.deals.filter(deal => deal.dealID && parsePrice(deal.price) !== null).map(deal => ({
      id: deal.dealID, gameId: game.id,
      store: stores.find(store => store.storeID === deal.storeID)?.storeName || 'Магазин ' + deal.storeID,
      price: parsePrice(deal.price), currency: 'USD',
      // API не підтверджує регіон/видання: не називаємо їх standard/all без перевірки.
      edition: 'unknown', region: 'unknown', url: dealUrl(deal.dealID),
    }));
  },
};
