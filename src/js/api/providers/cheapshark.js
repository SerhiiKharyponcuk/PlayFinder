import { config } from '../../config.js';
import { request } from '../http.js';
import { safeImage } from '../../utils/urls.js';

// Ціни CheapShark — USD. Не підставляй сюди EUR без окремої конвертації.
// null означає «немає коректної ціни». Number('') і Number(null) дали б 0,
// тому спочатку відкидаємо такі значення, щоб не показати платну гру безкоштовною.
export function parsePrice(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (String(value).trim() === '') return null;
  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : null;
}
export function dealUrl(id) {
  return 'https://www.cheapshark.com/redirect?dealID=' + encodeURIComponent(id);
}
// Список магазинів однаковий для всіх ігор; завантажуємо один раз на сторінку.
let storesPromise;
function getStores() {
  if (!storesPromise) storesPromise = request(config.cheapshark.baseUrl, 'stores')
    .catch(error => { storesPromise = null; throw error; });
  return storesPromise;
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
  // Повертається масив, а не одна гра: result.gameID не працює.
  // Відбираємо відповідність у services/card-prices.js, а не тут.
  // limit: 10 обмежує результати: відсутність збігу не доводить, що товару в базі немає.
  searchGames: (title, { signal } = {}) => request(config.cheapshark.baseUrl, 'games', { query: { title, limit: 10 }, signal }),
  async getOffers(game, { signal, currency = 'USD' } = {}) {
    // Метод отримує пропозиції ВЖЕ ОБРАНОГО товару. Він не перевіряє,
    // чи правильно зіставлений gameID з RAWG і чи товар є базовою грою.
    if (currency !== 'USD') throw new Error('CheapShark надає ціни лише у USD.');
    const id = game.providerIds?.cheapshark;
    // ?. поверне undefined, якщо providerIds немає. RAWG ID сюди підставляти не можна.
    if (!id) throw new Error('Спочатку обери відповідну гру CheapShark та збережи її gameID у providerIds.cheapshark.');
    const [data, stores] = await Promise.all([
      request(config.cheapshark.baseUrl, 'games', { query: { id }, signal }),
      getStores(),
    ]);
    if (!Array.isArray(data.deals) || !Array.isArray(stores)) throw new Error('Некоректна відповідь CheapShark.');
    // Використовуємо data.deals — поточні пропозиції.
    // cheapestPriceEver — історичний мінімум, за ним зараз купити може бути неможливо.
    return data.deals.filter(deal => deal.dealID && parsePrice(deal.price) !== null).map(deal => ({
      id: deal.dealID, gameId: game.id,
      store: stores.find(store => store.storeID === deal.storeID)?.storeName || 'Магазин ' + deal.storeID,
      price: parsePrice(deal.price), currency: 'USD',
      // API не підтверджує регіон/видання: не називаємо їх standard/all без перевірки.
      // unknown не означає «базова гра». Фільтрація видань ще потребує допрацювання.
      edition: 'unknown', region: 'unknown', url: dealUrl(deal.dealID),
    }));
  },
};
