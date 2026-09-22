import { config } from '../../config.js';
import { request } from '../http.js';

// TODO: додай реальні endpoint-и та перетворення відповіді у Game (див. ../types.js).
// Приклад виклику: request(config.api.catalog, 'games', { query: params, signal });
export const catalogProvider = {
  id: 'catalog',
  request: (path, options) => request( "https://api.rawg.io/api/", path, options),
  async getGames(params = {}, { signal } = {}) {
    const data = await this.request('games', { query: params, signal });
    // throw new Error('Підключи catalogProvider.getGames');
    console.log('catalogProvider.getGames', data);
    return data;
  },
  async getGame(id, { signal } = {}) {
    const data = await this.request(`games/${id}`, { signal });
    // throw new Error('Підключи catalogProvider.getGame');
    console.log('catalogProvider.getGame', data);
    return data;
  },
};
