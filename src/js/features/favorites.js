import { isFirebaseConfigured } from '../api/firebase/config.js';
const controllers = new WeakMap();
let services;
function loadServices() {

  if (!isFirebaseConfigured()) return Promise.reject(new Error('Спочатку налаштуй Firebase для входу й обраного.'));
  services ||= Promise.all([import('../services/auth-service.js'), import('../services/favorites-service.js')])
    .then(([auth, favorites]) => ({ authService: auth.authService, favoritesService: favorites.favoritesService }))
    .catch(error => { services = undefined; throw error; });
  return services;
}

export function initFavorites(root = document.querySelector('main')) {
  if (!root) return;

  if (controllers.has(root)) return controllers.get(root);
  const status = document.createElement('p'); status.className = 'page-state';
  status.setAttribute('role', 'status'); status.hidden = true; root.append(status);
  let ids = new Set();
  const paint = () => root.querySelectorAll('[data-favorite-id]').forEach(button => {
    const saved = ids.has(button.dataset.favoriteId);
    button.setAttribute('aria-pressed', String(saved));
    button.setAttribute('aria-label', saved ? 'Видалити з обраного' : 'Додати в обране');
    button.classList.toggle('game-card__favorite--saved', saved);
  });
  controllers.set(root, paint);
  let revision = 0;
  let snapshot = Promise.resolve();
  let snapshotError;

  const ready = isFirebaseConfigured() ? loadServices().then(({ authService, favoritesService }) => new Promise(resolve => {
    authService.subscribe(user => {
      const current = ++revision; ids.clear(); snapshotError = undefined; paint();
      snapshot = (async () => {
        try {
          const saved = user ? await favoritesService.listIds() : [];
          if (current === revision) { ids = new Set(saved); paint(); }
        } catch (error) {
          if (current === revision) {
            snapshotError = error; status.hidden = false;
            status.textContent = 'Не вдалося прочитати обране. Перевір налаштування Firestore.';
          }
        } finally { resolve(); }
      })();
    });
  })) : Promise.resolve();
  ready.catch(() => { status.hidden = false; status.textContent = 'Не вдалося завантажити обране. Спробуй пізніше.'; });
  root.addEventListener('click', async event => {
    const button = event.target.closest('[data-favorite-id]'); if (!button) return;
    const id = button.dataset.favoriteId; button.disabled = true;
    try {
      const { favoritesService } = await loadServices();
      await ready;
      await snapshot;
      if (snapshotError) throw new Error('Не вдалося прочитати обране. Спробуй пізніше.');
      if (ids.has(id)) { await favoritesService.remove(id); ids.delete(id); }
      else { await favoritesService.add(id); ids.add(id); }
      paint(); status.hidden = false; status.textContent = 'Обране оновлено.';
    } catch (error) { status.hidden = false; status.textContent = error.message; }
    finally { button.disabled = false; }
  });
  return paint;
}
