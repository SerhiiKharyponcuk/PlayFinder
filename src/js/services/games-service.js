import { catalogProvider } from '../api/providers/catalog.js';

// Сторінки звертаються до сервісу, а не напряму до fetch або конкретного API.
export const gamesService = {
  getGames: (params, options) => catalogProvider.getGames(params, options),
  getGame: (id, options) => catalogProvider.getGame(id, options),
};
