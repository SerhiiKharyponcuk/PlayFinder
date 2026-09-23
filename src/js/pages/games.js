import { gamesService } from '../services/games-service.js';
import { readFilters } from '../features/filters.js';
import { renderGames } from '../components/cards.js';
import { loadSection } from '../components/load-section.js';
import { initFavorites } from '../features/favorites.js';

/** Каталог RAWG. Фільтри API дописуй тут; назви API-параметрів — у rawg.js. */
export async function init() {
  const filters = readFilters();
  for (const id of ['headerSearchInput', 'mobileSearchInput']) {
    const input = document.getElementById(id); if (input) input.value = filters.query;
  }
  await loadSection('gamesCatalog', 'gamesCatalogLoading', async () => {
    const result = await gamesService.getGames(filters);
    const count = document.getElementById('gamesFoundCount'); if (count) count.textContent = result.total;
    return result.games;
  }, renderGames);
  initFavorites();
  // Наступне завдання уроку: зв'язати решту toolbar/sidebar і пагінацію з getGames.
}
