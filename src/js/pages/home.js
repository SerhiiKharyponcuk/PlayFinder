import { gamesService } from '../services/games-service.js';
import { cheapsharkProvider } from '../api/providers/cheapshark.js';
import { renderDeals } from '../components/cards.js';
import { createGameList } from '../components/game-list.js';
import { loadSection } from '../components/load-section.js';
import { initFavorites } from '../features/favorites.js';
import { initHomeFilters } from '../features/filters.js';

export async function init() {
  initHomeFilters();
  const repaint = initFavorites();
  const views = [createGameList('popularGames', 'popularLoading', repaint), createGameList('newReleaseGames', 'newReleasesLoading', repaint)];
  const lists = gamesService.getGameLists([{ pageSize: 6 }, { sort: 'release', pageSize: 6 }], {
    onList: (index, result) => views[index].publish(result.games),
    onListError: (index, error) => views[index].fail(error),
  });
  const loadGames = async index => {
    const result = (await lists)[index];
    if (result.status === 'rejected') throw result.reason;
    return result.value.games;
  };
  await Promise.all([
    loadSection('popularGames', 'popularLoading', () => loadGames(0), views[0].render, { track: false, onError: views[0].fail }),
    loadSection('newReleaseGames', 'newReleasesLoading', () => loadGames(1), views[1].render, { track: false, onError: views[1].fail }),
    loadSection('bestDeals', 'dealsLoading', () => cheapsharkProvider.getDeals({ limit: 5 }), renderDeals),
  ]);

  if (import.meta.env.DEV) console.info('CheapShark: запити цієї сторінки', JSON.stringify(cheapsharkProvider.diagnostics()));
}
