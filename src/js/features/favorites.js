import { isFirebaseConfigured } from '../api/firebase/client.js';
import { authService } from '../services/auth-service.js';
import { favoritesService } from '../services/favorites-service.js';

/** Один listener на контейнер працює і для карток, доданих пізніше. */
export function initFavorites(root = document.querySelector('main')) {
  if (!root) return;
  const status = document.createElement('p'); status.className = 'page-state';
  status.setAttribute('role', 'status'); status.hidden = true; root.append(status);
  let ids = new Set();
  const paint = () => root.querySelectorAll('[data-favorite-id]').forEach(button => {
    const saved = ids.has(button.dataset.favoriteId);
    button.setAttribute('aria-pressed', String(saved));
    button.setAttribute('aria-label', saved ? 'Видалити з обраного' : 'Додати в обране');
    button.classList.toggle('game-card__favorite--saved', saved);
  });
  let revision = 0;
  if (isFirebaseConfigured()) authService.subscribe(async user => {
    const current = ++revision; ids.clear(); paint();
    if (!user) return;
    try { const saved = await favoritesService.listIds(); if (current === revision) { ids = new Set(saved); paint(); } }
    catch { status.hidden = false; status.textContent = 'Не вдалося прочитати обране. Перевір налаштування Firestore.'; }
  });
  root.addEventListener('click', async event => {
    const button = event.target.closest('[data-favorite-id]'); if (!button) return;
    const id = button.dataset.favoriteId; button.disabled = true;
    try {
      if (ids.has(id)) { await favoritesService.remove(id); ids.delete(id); }
      else { await favoritesService.add(id); ids.add(id); }
      paint(); status.hidden = false; status.textContent = 'Обране оновлено.';
    } catch (error) { status.hidden = false; status.textContent = error.message; }
    finally { button.disabled = false; }
  });
}
