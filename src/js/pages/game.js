import { gamesService } from '../services/games-service.js';
import { getOffers } from '../services/prices-service.js';
import { showMessage } from '../components/load-section.js';
import { renderGameDetails } from '../components/game-details.js';
import { initFavorites } from '../features/favorites.js';
import { cheapsharkProvider } from '../api/providers/cheapshark.js';
import { initPageAnimations } from '../animations/page-animations.js';
import { siteLoading } from '../components/site-loader.js';

export async function init() {
  const container = document.getElementById('gameDetails');
  const id = new URLSearchParams(location.search).get('id');
  if (!id) {
    showMessage(container, 'Обери гру в каталозі.');
    return;
  }
  container.setAttribute('aria-busy', 'true');
  const loading = siteLoading.begin('Завантажуємо гру…', 2);
  const repaint = initFavorites();
  try {
    const game = await gamesService.getGame(id, { onGame: early => {
      loading.update('Перевіряємо ціни гри…', 1);

      document.title = early.title + ' — PlayFinder';
      document.getElementById('gameBreadcrumb').textContent = early.title;
      renderGameDetails(container, early);
      initPageAnimations(container);
      container.setAttribute('aria-busy', 'false');
      repaint?.();
    } });

    const prices = game.providerIds.cheapshark ? await getOffers(game) : { offers: [], errors: [] };
    document.title = game.title + ' — PlayFinder';
    document.getElementById('gameBreadcrumb').textContent = game.title;

    renderGameDetails(container, game, prices, { pricesOnly: true });
    if (import.meta.env.DEV) console.info('CheapShark: запити цієї сторінки', JSON.stringify(cheapsharkProvider.diagnostics()));
  } catch (error) { showMessage(container, error.message); }
  finally { loading.finish(); container.setAttribute('aria-busy', 'false'); }
}
