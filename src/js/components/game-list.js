import { renderGames, updateGamePrices } from './cards.js';
import { showMessage } from './load-section.js';
import { addCardPrices } from '../services/card-prices.js';
import { cheapsharkProvider } from '../api/providers/cheapshark.js';
import { siteLoading } from './site-loader.js';

export function createGameList(id, loaderId, repaintFavorites = () => {}, { transform = games => games, onPublish = () => {} } = {}) {
  const container = document.getElementById(id);
  const loader = document.getElementById(loaderId);
  const feedback = document.createElement('div');
  feedback.className = 'price-feedback'; feedback.hidden = true;
  feedback.setAttribute('role', 'status');
  container.after(feedback);
  let current = [];
  let timer;
  let retrying = false;
  let loading = siteLoading.begin('Завантажуємо ігри…', 2);
  const failed = game => game.priceStatus === 'error' || game.priceStatus === 'limited';

  function showPriceState() {
    clearTimeout(timer);
    const pending = current.filter(game => game.priceStatus === 'loading').length;
    const errors = current.filter(failed).length;
    if (pending) {
      loading ||= siteLoading.begin('Перевіряємо ціни ігор…');
      loading.update('Перевіряємо ціни ігор…', 1);
    } else { loading?.finish(); loading = undefined; }
    feedback.replaceChildren();
    feedback.hidden = !pending && !errors;
    if (feedback.hidden) return;
    const text = document.createElement('span');
    if (pending) {
      const spinner = document.createElement('span'); spinner.className = 'loading-spinner'; spinner.setAttribute('aria-hidden', 'true');
      feedback.append(spinner);
      text.textContent = `Картки готові · шукаємо ціни ще для ${pending} ігор…`;
    } else {

      text.textContent = 'Частина цін тимчасово недоступна. Картки можна відкривати.';
      const wait = Math.max(0, Math.ceil((cheapsharkProvider.diagnostics().pausedUntil - Date.now()) / 1000));
      const button = document.createElement('button'); button.type = 'button'; button.className = 'price-feedback__retry';
      button.textContent = wait ? `Оновити через ${wait} с` : 'Оновити ціни';
      button.disabled = retrying || wait > 0;
      feedback.append(button);
      if (wait) timer = setTimeout(showPriceState, 1000);
    }
    feedback.prepend(text);
  }

  function publish(games) {
    current = games;
    const visible = transform(games);
    const shown = [...container.querySelectorAll('.game-card')].map(node => node.dataset.gameId);
    if (!visible.length) showMessage(container, 'За цим запитом нічого не знайдено.');
    else if (shown.length === visible.length && visible.every((game, index) => String(game.id) === shown[index])) updateGamePrices(container, visible);
    else renderGames(container, visible);
    if (loader) loader.hidden = true;
    container.setAttribute('aria-busy', 'false');
    repaintFavorites();
    showPriceState();
    onPublish(visible, games);
  }

  feedback.addEventListener('click', async event => {
    if (!event.target.closest('.price-feedback__retry') || retrying || cheapsharkProvider.diagnostics().pausedUntil > Date.now()) return;
    retrying = true;
    const retry = current.filter(failed);
    const ids = new Set(retry.map(game => game.id));
    publish(current.map(game => ids.has(game.id) ? { ...game, priceStatus: 'loading' } : game));
    try {
      const updated = new Map((await addCardPrices(retry)).map(game => [game.id, game]));
      publish(current.map(game => updated.get(game.id) || game));
    } catch {

      const originals = new Map(retry.map(game => [game.id, game]));
      publish(current.map(game => originals.get(game.id) || game));
    } finally { retrying = false; showPriceState(); }
  });

  function fail(error) {
    loading?.finish(); loading = undefined;
    clearTimeout(timer); current = []; feedback.hidden = true;
    if (loader) loader.hidden = true;
    container.setAttribute('aria-busy', 'false');
    showMessage(container, error.message || 'Не вдалося завантажити ігри.');
  }
  return { publish, fail, render: (_container, games) => publish(games) };
}
