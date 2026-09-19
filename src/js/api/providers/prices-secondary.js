import { config } from '../../config.js';
import { request } from '../http.js';

// TODO: використовуй game.providerIds для відповідності ID між сервісами.
// Поверни Offer[] у форматі ../types.js. Ціни різних валют не конвертуються автоматично.
export const secondaryPricesProvider = {
  id: 'secondary',
  enabled: false, // Увімкни після реалізації getOffers.
  request: (path, options) => request(config.api.pricesSecondary, path, options),
  async getOffers(game, { currency, region, edition, signal } = {}) {
    throw new Error('Підключи secondaryPricesProvider.getOffers');
  },
};
