import { updateFilterSearch } from './catalog-state.js';
import { normalizeSearchQuery } from './search-query.js';

export function initSearch() {
  for (const id of ['headerSearchForm', 'mobileSearchForm']) {
    document.getElementById(id)?.addEventListener('submit', event => {
      event.preventDefault();
      const query = normalizeSearchQuery(event.currentTarget.querySelector('input')?.value);
      const search = updateFilterSearch(document.body.dataset.page === 'games' ? location.search : '', { query });
      location.assign('./games.html' + search);
    });
  }
}
