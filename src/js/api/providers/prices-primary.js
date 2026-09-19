import { config } from '../../config.js';
import { request } from '../http.js';

// TODO: використовуй game.providerIds для відповідності ID між сервісами.
// Поверни Offer[] у форматі ../types.js. Ціни різних валют не конвертуються автоматично.
export const primaryPricesProvider = {
  id: 'primary',
  enabled: false, // Увімкни після реалізації getOffers.
  request: (path, options) => request(config.api.pricesPrimary, path, options),
  async getOffers(game, { currency, region, edition, signal } = {}) {
    throw new Error('Підключи primaryPricesProvider.getOffers');
  },
};
