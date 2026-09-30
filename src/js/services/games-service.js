import { rawgProvider } from '../api/providers/rawg.js';
import { addCardPrice, addCardPrices } from './card-prices.js';
// Сторінки викликають сервіс. getGames повертає { games, total, hasNext }, не сирий JSON.
// RAWG дає опис гри, але не ціну. addCardPrice доповнює кожну гру даними CheapShark.
// Тут поєднуємо джерела, щоб головна, каталог і обране мали одну логіку.
export const gamesService = {
  async getGames(params, options = {}) {
    const result = await rawgProvider.getGames(params, options);
    // Пошуки кешуються, а пропозиції ігор запитуються пакетами до 25 ID.
    return options.withPrices === false ? result : { ...result, games: await addCardPrices(result.games) };
  },
  async getGame(id, options = {}) {
    const game = await rawgProvider.getGame(id, options);
    return options.withPrices === false ? game : addCardPrice(game);
  },
  async getGameLists(paramsList) {
    // Головна має два списки. Об'єднуємо їх для ОДНОГО пакета цін.
    // Збій одного RAWG-списку не прибирає інший.
    const results = await Promise.allSettled(paramsList.map(params => rawgProvider.getGames(params)));
    const games = results.flatMap(result => result.status === 'fulfilled' ? result.value.games : []);
    const priced = await addCardPrices(games);
    let offset = 0;
    return results.map(result => {
      if (result.status === 'rejected') return result;
      const items = priced.slice(offset, offset + result.value.games.length);
      offset += items.length;
      return { status: 'fulfilled', value: { ...result.value, games: items } };
    });
  },
};
