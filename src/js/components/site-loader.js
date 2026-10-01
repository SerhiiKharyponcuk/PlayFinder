/** Лоадер відображає справжні завдання, а не штучний таймер/відсотки.
 * RAWG і CheapShark можуть завершитися в різному порядку. Кінець однієї
 * секції не приховує індикатор, поки інша ще завантажується.
 */
export function createLoadingController(render) {
  const tasks = new Map();
  let nextId = 0;
  const paint = () => {
    const active = [...tasks.values()].sort((a, b) => b.priority - a.priority);
    render({ visible: active.length > 0, label: active[0]?.label || '', count: active.length });
  };
  return {
    begin(label, priority = 1) {
      const id = ++nextId;
      tasks.set(id, { label, priority }); paint();
      return {
        update(label, priority = tasks.get(id)?.priority) {
          if (!tasks.has(id)) return;
          tasks.set(id, { label, priority }); paint();
        },
        finish() { if (tasks.delete(id)) paint(); },
      };
    },
  };
}

export const siteLoading = createLoadingController(state => {
  if (typeof document === 'undefined') return;
  const loader = document.getElementById('siteLoader');
  if (!loader) return;
  loader.hidden = !state.visible;
  loader.querySelector('[data-loading-label]').textContent = state.label;
});
