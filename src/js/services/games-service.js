import { rawgProvider } from '../api/providers/rawg.js';
import { addCardPrice, addCardPrices } from './card-prices.js';
// Сторінки викликають сервіс. getGames повертає { games, total, hasNext }, не сирий JSON.
// RAWG дає опис гри, але не ціну. addCardPrice доповнює кожну гру даними CheapShark.
// Тут поєднуємо джерела, щоб головна, каталог і обране мали одну логіку.
const pendingPrices = games => games.map(game => ({ ...game, priceStatus: 'loading' }));

// onGames / onGame / onList — ранній показ даних RAWG. Повернений Promise,
// як і раніше, містить кінцеві дані з цінами. Це зручно порівняти на уроці.
export function createGamesService({ provider = rawgProvider, priceOne = addCardPrice, priceMany = addCardPrices } = {}) {
  return {
    async getGames(params, options = {}) {
      const result = await provider.getGames(params, options);
      options.onGames?.({ ...result, games: options.withPrices === false ? result.games : pendingPrices(result.games) });
      // Пошуки кешуються, а пропозиції ігор запитуються пакетами до 25 ID.
      return options.withPrices === false ? result : { ...result, games: await priceMany(result.games) };
    },
    async getGame(id, options = {}) {
      const game = await provider.getGame(id, options);
      options.onGame?.(options.withPrices === false ? game : pendingPrices([game])[0]);
      return options.withPrices === false ? game : priceOne(game);
    },
    async getGameLists(paramsList, { onList, onListError } = {}) {
      // Головна має два списки. Об'єднуємо їх для ОДНОГО пакета цін.
      // Збій одного RAWG-списку не прибирає інший.
      const results = await Promise.allSettled(paramsList.map((params, index) => provider.getGames(params).then(result => {
        // Популярні не чекають нових релізів, і обидва списки не чекають CheapShark.
        onList?.(index, { ...result, games: pendingPrices(result.games) });
        return result;
      }, error => { onListError?.(index, error); throw error; })));
      const games = results.flatMap(result => result.status === 'fulfilled' ? result.value.games : []);
      const priced = await priceMany(games);
      let offset = 0;
      return results.map(result => {
        if (result.status === 'rejected') return result;
        const items = priced.slice(offset, offset + result.value.games.length);
        offset += items.length;
        return { status: 'fulfilled', value: { ...result.value, games: items } };
      });
    },
  };
}
export const gamesService = createGamesService();
