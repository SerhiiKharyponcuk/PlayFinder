/**
 * СПІЛЬНИЙ ПОШУК у шапці: зараз лише відкриває games.html?q=введений_текст.
 * Запит RAWG за цим текстом уже виконує pages/games.js через gamesService.
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
