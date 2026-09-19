import { showSetupState } from '../components/page-state.js';
export function init() {
  showSetupState('priceOffers', ['priceOffersLoading']);
  // TODO: gamesService.getGame(id) → getOffers(game, { currency, region, edition }).
  // Показуй errors для недоступних джерел; Offer[] рендер у #priceOfferTemplate.
}
