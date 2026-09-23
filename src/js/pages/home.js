import { gamesService } from '../services/games-service.js';
import { cheapsharkProvider } from '../api/providers/cheapshark.js';
import { renderGames, renderDeals } from '../components/cards.js';
import { loadSection } from '../components/load-section.js';
import { initFavorites } from '../features/favorites.js';

/** ПИШИ ЛОГІКУ ГОЛОВНОЇ ТУТ. Запит → нормалізовані дані → Handlebars → DOM.
 * RAWG дає картки, CheapShark — праву колонку з цінами.
 * Рендер відбувається всередині init: заглушка більше не стирає картки.
 */
export async function init() {
  await Promise.all([
    loadSection('popularGames', 'popularLoading', async () => (await gamesService.getGames({ pageSize: 6 })).games, renderGames),
    loadSection('newReleaseGames', 'newReleasesLoading', async () => (await gamesService.getGames({ sort: 'release', pageSize: 6 })).games, renderGames),
    loadSection('bestDeals', 'dealsLoading', () => cheapsharkProvider.getDeals({ limit: 5 }), renderDeals),
  ]);
  initFavorites();
}
