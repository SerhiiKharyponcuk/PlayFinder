import { gamesService } from '../services/games-service.js';
import { readFilters, initFilters } from '../features/filters.js';
import { hasPriceFilter, selectCatalogGames } from '../features/catalog-state.js';
import { createGameList } from '../components/game-list.js';
import { initFavorites } from '../features/favorites.js';

export async function init() {
  const filters = readFilters();
  const controls = initFilters(filters);
  const container = document.getElementById('gamesCatalog');
  const empty = document.getElementById('gamesEmpty');
  const errorPanel = document.getElementById('gamesError');
  const count = document.getElementById('gamesVisibleCount');
  const priceScope = document.getElementById('gamesPriceScope');
  priceScope.hidden = !hasPriceFilter(filters) && !filters.sort.startsWith('price-');
  const view = createGameList('gamesCatalog', 'gamesCatalogLoading', initFavorites(), {
    transform: games => selectCatalogGames(games, filters),
    onPublish(visible, games) {
      const pending = games.some(game => game.priceStatus === 'loading');
      container.hidden = !visible.length; empty.hidden = visible.length > 0 || pending;
      count.textContent = `На сторінці: ${visible.length} із ${games.length}${pending ? ' · ціни завантажуються' : ''}`;
    },
  });
  document.getElementById('retryGamesButton').addEventListener('click', () => location.reload());
  for (const id of ['headerSearchInput', 'mobileSearchInput']) document.getElementById(id).value = filters.query;
  const publish = result => {
    document.getElementById('gamesFoundCount').textContent = new Intl.NumberFormat('uk-UA').format(result.total);
    controls.pagination(result);
    view.publish(result.games);
  };
  try {
    const result = await gamesService.getGames(filters, { onGames: publish });
    publish(result);
  } catch (error) {
    view.fail(error); container.hidden = true; errorPanel.hidden = false;
    errorPanel.querySelector('p').textContent = error.message || 'Не вдалося завантажити каталог.';
    count.textContent = ''; empty.hidden = true;
  }
}
