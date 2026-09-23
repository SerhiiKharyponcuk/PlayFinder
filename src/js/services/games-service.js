import { rawgProvider } from '../api/providers/rawg.js';
// Сторінки викликають сервіс. getGames повертає { games, total, hasNext }, не сирий JSON.
export const gamesService = {
  getGames: (params, options) => rawgProvider.getGames(params, options),
  getGame: (id, options) => rawgProvider.getGame(id, options),
};
