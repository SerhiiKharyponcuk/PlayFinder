/**
 * СТОРІНКА ПОРІВНЯННЯ (prices.html).
 * Тут обираємо гру, отримуємо пропозиції через services/prices-service.js,
 * заповнюємо #priceOfferTemplate і додаємо рядки в #priceOffers.
 * Дані для Game та Offer — різні: назва й обкладинка гри не є ціною магазину.
 * Зараз виконується лише заглушка; адаптери цін треба реалізувати окремо.
 */

import { showSetupState } from '../components/page-state.js';
export function init() {
  showSetupState('priceOffers', ['priceOffersLoading']);
  // TODO: gamesService.getGame(id) → getOffers(game, { currency, region, edition }).
  // Показуй errors для недоступних джерел; Offer[] рендер у #priceOfferTemplate.
}
