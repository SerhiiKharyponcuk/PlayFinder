/**
 * СПІЛЬНИЙ ПОШУК у шапці: зараз лише відкриває games.html?q=введений_текст.
 * Запит до API за цим текстом потрібно додати в pages/games.js.
 * Підказки під полем — окреме майбутнє завдання, вони тут поки не реалізовані.
 */

export function initSearch() {
  for (const id of ['headerSearchForm', 'mobileSearchForm']) {
    const form = document.getElementById(id);
    form?.addEventListener('submit', event => {
      event.preventDefault();
      const query = form.querySelector('input')?.value.trim();
      if (query) window.location.assign('./games.html?q=' + encodeURIComponent(query));
    });
  }
  // TODO: autocomplete через gamesService.getGames({ query }), debounce та AbortController.
}
