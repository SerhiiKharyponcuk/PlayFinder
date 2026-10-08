import { siteLoading } from './site-loader.js';

export function showMessage(container, text) {
  const message = document.createElement('p');
  message.className = 'page-state'; message.setAttribute('role', 'status');
  message.textContent = text; container.replaceChildren(message);
}
export function showLoading(container, text) {
  showMessage(container, text);
  const spinner = document.createElement('span'); spinner.className = 'loading-spinner'; spinner.setAttribute('aria-hidden', 'true');
  container.firstElementChild.prepend(spinner, ' ');
}
export async function loadSection(id, loaderId, load, render, { track = true, label = 'Завантажуємо пропозиції…', onError } = {}) {
  const container = document.getElementById(id);
  if (!container) return;
  const loading = track ? siteLoading.begin(label, 2) : null;
  const loader = document.getElementById(loaderId);
  if (loader) loader.hidden = false;
  if (loader) { loader.setAttribute('role', 'status'); loader.setAttribute('aria-label', 'Завантаження даних'); }
  container.setAttribute('aria-busy', 'true');
  try {
    const items = await load();
    if (items.length) render(container, items);
    else showMessage(container, 'За цим запитом нічого не знайдено.');
  } catch (error) {

    if (onError) onError(error);
    else showMessage(container, error.message || 'Не вдалося завантажити дані. Спробуй пізніше.');
  } finally {
    loading?.finish();
    if (loader) loader.hidden = true;
    container.setAttribute('aria-busy', 'false');
  }
}
