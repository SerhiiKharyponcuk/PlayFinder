import { favoritesService } from '../services/favorites-service.js';
import { authService } from '../services/auth-service.js';
import { isFirebaseConfigured } from '../api/firebase/client.js';
import { gamesService } from '../services/games-service.js';
import { addCardPrices } from '../services/card-prices.js';
import { renderGames, updateGamePrices } from '../components/cards.js';
import { siteLoading } from '../components/site-loader.js';

export function init({ root = document, auth = authService, favorites = favoritesService,
  games = gamesService, priceGames = addCardPrices, configured = isFirebaseConfigured(), loading = siteLoading } = {}) {
  const container = root.getElementById('favoriteGames');
  const skeletons = root.getElementById('favoriteGamesLoading');
  const state = root.getElementById('favoritesState');
  const notice = root.getElementById('favoritesStatus');
  const count = root.getElementById('favoriteGamesCount');
  const reload = root.getElementById('favoritesReloadButton');
  const link = root.getElementById('favoritesStateLink');
  let revision = 0;
  let currentUser = null;
  let savedIds = new Set();
  let task = null;

  function showNotice(text, tone = 'info') {
    notice.textContent = text;
    notice.dataset.tone = tone;
    notice.hidden = !text;
  }

  function updateCount() {
    const visible = container.querySelectorAll('.game-card').length;
    const plural = new Intl.PluralRules('uk').select(savedIds.size);
    const word = plural === 'one' ? 'гра' : plural === 'few' ? 'гри' : 'ігор';
    count.textContent = visible < savedIds.size ? `${visible} із ${savedIds.size}` : `${savedIds.size} ${word}`;
    count.title = `Збережено: ${savedIds.size}`;
  }

  function showState(type) {
    const states = {
      signedOut: ['fa-regular fa-heart', 'Твій список чекає на тебе', 'Увійди в акаунт, щоб побачити збережені ігри.'],
      empty: ['fa-regular fa-heart', 'Тут будуть твої улюблені ігри', 'Натисни на сердечко біля гри в каталозі — вона з’явиться в цьому списку.'],
      error: ['fa-solid fa-cloud-arrow-down', 'Не вдалося завантажити обране', 'Перевір інтернет і спробуй ще раз. Твої збережені ігри залишаються в акаунті.'],
      unavailable: ['fa-solid fa-circle-info', 'Обране тимчасово недоступне', 'Поки можна переглядати каталог. Спробуй зайти до обраного пізніше.'],
    };
    const [icon, title, description] = states[type];
    root.getElementById('favoritesStateIcon').className = icon;
    root.getElementById('favoritesStateTitle').textContent = title;
    root.getElementById('favoritesStateDescription').textContent = description;
    container.hidden = skeletons.hidden = true;
    container.setAttribute('aria-busy', 'false');
    state.hidden = false;
    link.hidden = type !== 'signedOut';
    reload.hidden = type !== 'error';
    count.textContent = type === 'empty' ? '0 ігор' : '—';
    count.removeAttribute('title');
  }

  function showLoading() {
    showNotice('');
    container.replaceChildren();
    container.hidden = state.hidden = true;
    skeletons.hidden = false;
    container.setAttribute('aria-busy', 'true');
    count.textContent = '…';
    count.removeAttribute('title');
  }

  if (!configured) { showState('unavailable'); return; }
  task = loading.begin('Перевіряємо вхід…', 2);
  state.hidden = true;
  skeletons.hidden = false;
  count.textContent = '…';

  const onUser = async user => {
    const current = ++revision;
    currentUser = user;
    savedIds = new Set();
    task?.finish();
    container.replaceChildren();
    root.getElementById('favoritesAccountLabel').textContent = user ? 'Мій акаунт' : 'Увійти';
    if (!user) { showNotice(''); showState('signedOut'); return; }
    const currentTask = loading.begin('Завантажуємо обране…', 2);
    task = currentTask;
    showLoading();
    try {
      const ids = [...new Set(await favorites.listIds())];
      if (current !== revision) return;
      savedIds = new Set(ids.map(String));
      if (!ids.length) { showState('empty'); return; }
      const results = [];
      for (let i = 0; i < ids.length; i += 4) {
        results.push(...await Promise.allSettled(ids.slice(i, i + 4).map(id => games.getGame(id, { withPrices: false }))));
        if (current !== revision) return;
      }
      const loaded = results.filter(result => result.status === 'fulfilled').map(result => result.value);
      if (!loaded.length) { showState('error'); return; }
      renderGames(container, loaded.map(game => ({ ...game, priceStatus: 'loading' })));
      container.querySelectorAll('[data-favorite-id]').forEach(button => {
        button.setAttribute('aria-pressed', 'true');
        button.setAttribute('aria-label', 'Видалити з обраного');
        button.querySelector('i').className = 'fa-solid fa-heart';
      });
      container.hidden = false;
      container.setAttribute('aria-busy', 'false');
      skeletons.hidden = state.hidden = true;
      updateCount();
      if (loaded.length < ids.length) showNotice('Частину ігор не вдалося завантажити. Онови сторінку, щоб спробувати ще раз.');
      currentTask.update('Перевіряємо ціни обраного…', 1);
      let priced;
      try { priced = await priceGames(loaded); }
      catch { priced = loaded.map(game => ({ ...game, priceStatus: 'error' })); }
      if (current !== revision) return;
      updateGamePrices(container, priced);
    } catch {
      if (current === revision) showState('error');
    } finally { currentTask.finish(); }
  };

  function onAuthError() {
    ++revision;
    currentUser = null;
    task?.finish();
    container.replaceChildren();
    showNotice('');
    showState('unavailable');
  }
  try {
    const unsubscribe = auth.subscribe(onUser, onAuthError);
    root.defaultView?.addEventListener('pagehide', event => {
      if (event.persisted) return;
      ++revision;
      task?.finish();
      unsubscribe?.();
    }, { once: true });
  } catch { onAuthError(); }

  reload.addEventListener('click', () => { if (currentUser) onUser(currentUser); });
  container.addEventListener('click', async event => {
    const button = event.target.closest('[data-favorite-id]');
    if (!button || button.disabled) return;
    const current = revision;
    button.disabled = true;
    showNotice('');
    try {
      await favorites.remove(button.dataset.favoriteId);
      if (current !== revision) return;
      savedIds.delete(button.dataset.favoriteId);
      button.closest('.game-card').remove();
      updateCount();
      if (!savedIds.size) showState('empty');
      else if (!container.querySelector('.game-card')) showState('error');
      showNotice('Гру видалено з обраного.');
    } catch {
      if (current !== revision) return;
      showNotice('Не вдалося видалити гру. Перевір інтернет і спробуй ще раз.', 'error');
      button.disabled = false;
    }
  });
}
