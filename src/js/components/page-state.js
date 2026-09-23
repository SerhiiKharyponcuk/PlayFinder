/**
 * ТИМЧАСОВА ЗАГЛУШКА, поки дані не підключено. Це не функція рендерингу карток.
 * targetId — ID контейнера БЕЗ #; loadingIds — ID індикаторів завантаження.
 * Увага: replaceChildren(message) нижче видаляє ВСЕ, що вже було в контейнері.
 * Тому після вставлення карток цю функцію викликати не можна — вона їх зітре.
 * Коли реалізуєш завантаження, заміни виклик на окремі loading / error / empty стани.
 */

export function showSetupState(targetId, loadingIds = []) {
  for (const id of loadingIds) {
    const loader = document.getElementById(id);
    if (loader) loader.hidden = true;
  }
  const target = document.getElementById(targetId);
  if (!target) return;
  const message = document.createElement('p');
  message.className = 'page-state';
  message.setAttribute('role', 'status');
  message.textContent = 'Ігри та ціни з’являться після підключення джерел даних.';
  target.replaceChildren(message);
}
