import { config } from '../../config.js';
import { request } from '../http.js';

// TODO: додай реальні endpoint-и та перетворення відповіді у Game (див. ../types.js).
// Приклад виклику: request(config.api.catalog, 'games', { query: params, signal });
export const catalogProvider = {
  id: 'catalog',
  request: (path, options) => request(config.api.catalog, path, options),
  async getGames(params = {}, { signal } = {}) {
    throw new Error('Підключи catalogProvider.getGames');
  },
  async getGame(id, { signal } = {}) {
    throw new Error('Підключи catalogProvider.getGame');
  },
};
