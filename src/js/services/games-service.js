import { rawgProvider } from '../api/providers/rawg.js';
import { addCardPrice, addCardPrices } from './card-prices.js';

const pendingPrices = games => games.map(game => ({ ...game, priceStatus: 'loading' }));

export function createGamesService({ provider = rawgProvider, priceOne = addCardPrice, priceMany = addCardPrices } = {}) {
  return {
    async getGames(params, options = {}) {
      const result = await provider.getGames(params, options);
      options.onGames?.({ ...result, games: options.withPrices === false ? result.games : pendingPrices(result.games) });

      return options.withPrices === false ? result : { ...result, games: await priceMany(result.games) };
    },
    async getGame(id, options = {}) {
      const game = await provider.getGame(id, options);
      options.onGame?.(options.withPrices === false ? game : pendingPrices([game])[0]);
      return options.withPrices === false ? game : priceOne(game);
    },
    async getGameLists(paramsList, { onList, onListError } = {}) {

      const results = await Promise.allSettled(paramsList.map((params, index) => provider.getGames(params).then(result => {

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
