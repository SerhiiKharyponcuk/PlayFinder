import { gamesService } from '../services/games-service.js';
import { cheapsharkProvider } from '../api/providers/cheapshark.js';
import { renderGames, renderDeals } from '../components/cards.js';
import { loadSection } from '../components/load-section.js';
import { initFavorites } from '../features/favorites.js';

/** ПИШИ ЛОГІКУ ГОЛОВНОЇ ТУТ. Запит → нормалізовані дані → Handlebars → DOM.
 * RAWG дає назви/зображення; gamesService додає ціни CheapShark до кожної картки.
 * Права колонка окремо показує актуальні пропозиції CheapShark.
 * Рендер відбувається всередині init: заглушка більше не стирає картки.
 */
export async function init() {
  const lists = gamesService.getGameLists([{ pageSize: 6 }, { sort: 'release', pageSize: 6 }]);
  const loadGames = async index => {
    const result = (await lists)[index];
    if (result.status === 'rejected') throw result.reason;
    return result.value.games;
  };
  await Promise.all([
    loadSection('popularGames', 'popularLoading', () => loadGames(0), renderGames),
    loadSection('newReleaseGames', 'newReleasesLoading', () => loadGames(1), renderGames),
    loadSection('bestDeals', 'dealsLoading', () => cheapsharkProvider.getDeals({ limit: 5 }), renderDeals),
  ]);
  initFavorites();
  // На уроці дивись цей звіт у консолі: network — реальні HTTP-спроби,
  // byEndpoint — пошуки / пропозиції / магазини / знижки, networkTotal — з початку нового кешу.
  if (import.meta.env.DEV) console.info('CheapShark: запити цієї сторінки', JSON.stringify(cheapsharkProvider.diagnostics()));
}
