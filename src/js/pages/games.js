import { showSetupState } from '../components/page-state.js';
import { readFilters } from '../features/filters.js';
export function init() {
  const filters = readFilters();
  for (const id of ['headerSearchInput', 'mobileSearchInput']) {
    const input = document.getElementById(id);
    if (input) input.value = filters.query;
  }
  showSetupState('gamesCatalog', ['gamesCatalogLoading']);
  // TODO: gamesService.getGames(filters), пагінація, #gameCardTemplate / #gameListTemplate.
}
