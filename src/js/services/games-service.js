import { rawgProvider } from '../api/providers/rawg.js';
import { addCardPrice } from './card-prices.js';
// Сторінки викликають сервіс. getGames повертає { games, total, hasNext }, не сирий JSON.
// RAWG дає опис гри, але не ціну. addCardPrice доповнює кожну гру даними CheapShark.
// Тут поєднуємо джерела, щоб головна, каталог і обране мали одну логіку.
export const gamesService = {
  async getGames(params, options) {
    const result = await rawgProvider.getGames(params, options);
    // Чекаємо доповнення всіх карток. Ліміт одночасних пошуків — у card-prices.js.
    return { ...result, games: await Promise.all(result.games.map(addCardPrice)) };
  },
  async getGame(id, options) {
    return addCardPrice(await rawgProvider.getGame(id, options));
  },
};
