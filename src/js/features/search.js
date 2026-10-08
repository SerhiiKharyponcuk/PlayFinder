import { updateFilterSearch } from './catalog-state.js';

export function initSearch() {
  for (const id of ['headerSearchForm', 'mobileSearchForm']) {
    document.getElementById(id)?.addEventListener('submit', event => {
      event.preventDefault();
      const query = event.currentTarget.querySelector('input')?.value.trim() || '';
      const search = updateFilterSearch(document.body.dataset.page === 'games' ? location.search : '', { query });
      location.assign('./games.html' + search);
    });
  }
}
