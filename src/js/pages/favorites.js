import { favoritesService } from '../services/favorites-service.js';
import { authService } from '../services/auth-service.js';
import { isFirebaseConfigured } from '../api/firebase/client.js';
import { gamesService } from '../services/games-service.js';
import { renderGames } from '../components/cards.js';
import { showMessage } from '../components/load-section.js';

export function init() {
  const container = document.getElementById('favoriteGames');
  if (!isFirebaseConfigured()) { showMessage(container, 'Спочатку налаштуй Firebase.'); return; }
  let revision = 0;
  authService.subscribe(async user => {
    const current = ++revision;
    if (!user) { showMessage(container, 'Увійди, щоб побачити своє обране.'); return; }
    showMessage(container, 'Завантаження обраного…');
    try {
      const ids = await favoritesService.listIds();
      const games = [];
      // Малими порціями, щоб не відправляти сотні RAWG-запитів одночасно.
      for (let i = 0; i < ids.length; i += 4) {
        games.push(...await Promise.all(ids.slice(i, i + 4).map(id => gamesService.getGame(id))));
        if (current !== revision) return;
      }
      if (!games.length) { showMessage(container, 'В обраному ще немає ігор.'); return; }
      renderGames(container, games);
      container.querySelectorAll('[data-favorite-id]').forEach(button => {
        button.setAttribute('aria-pressed', 'true'); button.setAttribute('aria-label', 'Видалити з обраного');
      });
    } catch (error) { if (current === revision) showMessage(container, error.message); }
  });
  container.addEventListener('click', async event => {
    const button = event.target.closest('[data-favorite-id]'); if (!button) return;
    button.disabled = true;
    try {
      await favoritesService.remove(button.dataset.favoriteId); button.closest('.game-card').remove();
      if (!container.querySelector('.game-card')) showMessage(container, 'В обраному ще немає ігор.');
    } catch (error) { document.getElementById('favoritesStatus').textContent = error.message; button.disabled = false; }
  });
}
