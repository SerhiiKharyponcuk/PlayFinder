import { gamesService } from '../services/games-service.js';
import { getOffers } from '../services/prices-service.js';
import { showMessage } from '../components/load-section.js';
import { renderGameDetails } from '../components/game-details.js';
import { initFavorites } from '../features/favorites.js';
import { cheapsharkProvider } from '../api/providers/cheapshark.js';

export async function init() {
  const container = document.getElementById('gameDetails');
  const id = new URLSearchParams(location.search).get('id');
  if (!id) {
    showMessage(container, 'Обери гру в каталозі.');
    return;
  }
  container.setAttribute('aria-busy', 'true');
  try {
    const game = await gamesService.getGame(id);
    // ID та мінімум уже знайдені. Повні пропозиції читають той самий індивідуальний
    // кеш, який записав пакет карток: не починаємо новий пошук CheapShark.
    const prices = game.providerIds.cheapshark ? await getOffers(game) : { offers: [], errors: [] };
    document.title = game.title + ' — PlayFinder';
    document.getElementById('gameBreadcrumb').textContent = game.title;
    renderGameDetails(container, game, prices);
    initFavorites(container);
    if (import.meta.env.DEV) console.info('CheapShark: запити цієї сторінки', JSON.stringify(cheapsharkProvider.diagnostics()));
  } catch (error) { showMessage(container, error.message); }
  finally { container.setAttribute('aria-busy', 'false'); }
}

