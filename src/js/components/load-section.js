/** Завантаження однієї секції: збій RAWG не блокує CheapShark і навпаки. */
export function showMessage(container, text) {
  const message = document.createElement('p');
  message.className = 'page-state'; message.setAttribute('role', 'status');
  message.textContent = text; container.replaceChildren(message);
}
export async function loadSection(id, loaderId, load, render) {
  const container = document.getElementById(id);
  if (!container) return;
  const loader = document.getElementById(loaderId);
  if (loader) loader.hidden = false;
  container.setAttribute('aria-busy', 'true');
  try {
    const items = await load();
    if (items.length) render(container, items);
    else showMessage(container, 'За цим запитом нічого не знайдено.');
  } catch (error) {
    // Помилка стає видимою користувачу, а не тільки в console.log.
    showMessage(container, error.message || 'Не вдалося завантажити дані. Спробуй пізніше.');
  } finally {
    if (loader) loader.hidden = true;
    container.setAttribute('aria-busy', 'false');
  }
}
