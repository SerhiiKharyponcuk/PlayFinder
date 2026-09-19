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
