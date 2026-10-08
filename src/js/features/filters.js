import { FILTER_LABELS } from '../api/rawg-filters.js';
import { FILTER_DEFAULTS, normalizeFilters, updateFilterSearch } from './catalog-state.js';
export { readFilters, updateFilterSearch } from './catalog-state.js';

export function initHomeFilters(root = document) {
  const open = patch => location.assign('./games.html' + updateFilterSearch('', patch));
  const selects = { platformFilter: 'platform', genreFilter: 'genre', gamesGenreFilter: 'genre',
    storeFilter: 'store', sortFilter: 'sort', sidebarSort: 'sort' };
  for (const [id, field] of Object.entries(selects)) root.getElementById(id)?.addEventListener('change', event => open({ [field]: event.target.value }));
  root.querySelectorAll('input[name="platform"], input[name="genre"], input[name="store"]').forEach(input =>
    input.addEventListener('change', () => {
      const patch = {};
      for (const field of ['platform', 'genre', 'store']) patch[field] = [...root.querySelectorAll(`input[name="${field}"]:checked`)].map(item => item.value).join(',');
      open(patch);
    }));
  root.querySelectorAll('.catalog-filter__title').forEach(button => {
    button.setAttribute('aria-expanded', 'true');
    button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') !== 'true'; button.setAttribute('aria-expanded', String(expanded));
      [...button.parentElement.children].filter(child => child !== button).forEach(child => { child.hidden = !expanded; });
    });
  });
  root.querySelectorAll('.catalog-more').forEach(button => button.addEventListener('click', () => open({})));
}

const PRESETS = { '': [null, null], free: [null, 0], '0-10': [0, 10], '10-30': [10, 30], '30-60': [30, 60], '60+': [60, null] };
const SELECTS = { gamesPlatformFilter: 'platform', gamesGenreFilter: 'genre', gamesStoreFilter: 'store',
  gamesYearFilter: 'year', gamesSortFilter: 'sort', mobileGamesSort: 'sort', gamesPerPage: 'pageSize' };
export function initFilters(initial, { root = document, onChange = changes => {
  const search = updateFilterSearch(location.search, changes);
  if (search !== location.search) location.assign(location.pathname + search + location.hash);
} } = {}) {
  const get = id => root.getElementById(id);
  const all = selector => [...(root.querySelectorAll?.(selector) || [])];
  const doc = root.ownerDocument || root;
  const sidebar = get('gamesSidebar'), mobile = get('mobileFiltersContent');
  const drawer = get('gamesFilterDrawer'), overlay = get('gamesFilterOverlay');
  let filters = normalizeFilters(initial), draft = null, previousFocus, previousOverflow;
  for (const [id, field] of Object.entries(SELECTS)) {
    const select = get(id);
    if (select && FILTER_LABELS[field] && select.options) {
      const existing = new Set([...select.options].map(option => option.value));
      for (const [value, label] of Object.entries(FILTER_LABELS[field])) {
        if (!existing.has(value)) { const option = doc.createElement('option'); option.value = value; option.textContent = label; select.append(option); }
      }
    }
    select?.addEventListener('change', event => onChange({ [field]: event.target.value }));
  }
  function syncScope(scope, state) {
    scope?.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.checked = String(state[input.name] || '').split(',').includes(input.value);
    });
    for (const [key, field] of [['priceMin', 'minPrice'], ['priceMax', 'maxPrice']]) {
      const input = scope?.querySelector(`[data-control="${key}"]`);
      if (input) input.value = state[field] ?? '';
      const slider = scope?.querySelector(`[data-control="${key}Range"]`);
      if (slider) slider.value = Math.min(500, state[field] ?? (field === 'minPrice' ? 0 : 500));
    }
  }
  function renderChips() {
    const container = get('activeFilterItems'); if (!container) return;
    container.replaceChildren();
    const chip = (label, changes) => {
      const button = doc.createElement('button'); button.type = 'button'; button.className = 'active-filter';
      button.textContent = label + ' ×'; button.setAttribute('aria-label', 'Прибрати: ' + label);
      button.addEventListener('click', () => onChange(changes)); container.append(button);
    };
    for (const field of ['platform', 'genre', 'store']) for (const value of filters[field].split(',').filter(Boolean)) {
      chip(FILTER_LABELS[field][value], { [field]: filters[field].split(',').filter(item => item !== value).join(',') });
    }
    if (filters.query) chip('Пошук: ' + filters.query, { query: '' });
    if (filters.year) chip('Рік: ' + filters.year, { year: '' });
    if (filters.release) chip(filters.release === 'recent' ? 'Релізи за 90 днів' : 'Очікувані з датою', { release: '' });
    if (filters.minPrice !== null || filters.maxPrice !== null) chip(`${filters.minPrice ?? 0}–${filters.maxPrice ?? '∞'} USD`, { minPrice: null, maxPrice: null });
    get('activeFilters').hidden = !container.children.length;
  }
  function sync() {
    for (const [id, field] of Object.entries(SELECTS)) {
      const select = get(id); if (!select) continue;
      const value = field === 'sort' && filters.sort === 'release' ? 'newest' : String(filters[field] ?? '');
      if (value.includes(',') && select.options) {
        let option = select.querySelector('[data-multiple]');
        if (!option) { option = doc.createElement('option'); option.dataset.multiple = ''; select.append(option); }
        option.value = value; option.textContent = `Обрано: ${value.split(',').length}`;
      }
      select.value = value;
      if (field === 'year' && value && select.options && ![...select.options].some(option => option.value === value)) {
        const option = doc.createElement('option'); option.value = value; option.textContent = value; select.append(option); select.value = value;
      }
    }
    const priceSelect = get('gamesPriceFilter');
    if (priceSelect) {
      let preset = Object.keys(PRESETS).find(key => PRESETS[key][0] === filters.minPrice && PRESETS[key][1] === filters.maxPrice);
      if (preset === undefined) {
        let option = priceSelect.querySelector('[data-custom]');
        if (!option) { option = doc.createElement('option'); option.value = 'custom'; option.dataset.custom = ''; priceSelect.append(option); }
        option.textContent = `${filters.minPrice ?? 0}–${filters.maxPrice ?? '∞'} USD`; preset = 'custom';
      }
      priceSelect.value = preset;
    }
    syncScope(sidebar, filters);
    all('[data-category]').forEach(button => {
      const key = button.dataset.category;
      const active = key === 'all' ? !filters.genre && !filters.release : key === 'new' ? filters.release === 'recent'
        : key === 'upcoming' ? filters.release === 'upcoming' : filters.genre === key && !filters.release;
      button.classList.toggle('games-category--active', active); button.setAttribute('aria-pressed', String(active));
    });
    get('gamesCatalog')?.classList.toggle('games-grid--list', filters.view === 'list');
    for (const [id, view] of [['gridViewButton', 'grid'], ['listViewButton', 'list']]) {
      get(id)?.classList.toggle('games-view__button--active', filters.view === view);
      get(id)?.setAttribute('aria-pressed', String(filters.view === view));
    }
    renderChips();
  }
  function bindScope(scope) {
    if (!scope) return;
    scope.querySelectorAll('[id]').forEach(input => { input.dataset.control ||= input.id; });
    scope.querySelectorAll('input[type="checkbox"]').forEach(input => input.addEventListener('change', () => {
      const values = [...scope.querySelectorAll(`input[name="${input.name}"]:checked`)].map(item => item.value);
      const patch = { [input.name]: input.name === 'year' ? (input.checked ? input.value : '') : values.join(',') };
      if (draft) { draft = normalizeFilters({ ...draft, ...patch }); syncScope(scope, draft); } else onChange(patch);
    }));
    const pricePatch = () => ({ minPrice: scope.querySelector('[data-control="priceMin"]').value,
      maxPrice: scope.querySelector('[data-control="priceMax"]').value });
    scope.querySelectorAll('[data-control="priceMin"], [data-control="priceMax"]').forEach(input => input.addEventListener('change', () => {
      const patch = pricePatch();
      if (draft) { draft = normalizeFilters({ ...draft, ...patch }); syncScope(scope, draft); } else onChange(patch);
    }));
    for (const [key, field] of [['priceMin', 'minPrice'], ['priceMax', 'maxPrice']]) {
      const slider = scope.querySelector(`[data-control="${key}Range"]`);
      slider?.addEventListener('input', () => {
        scope.querySelector(`[data-control="${key}"]`).value = field === 'maxPrice' && Number(slider.value) === 500 ? '' : slider.value;
      });
      slider?.addEventListener('change', () => {
        const patch = pricePatch();
        if (draft) { draft = normalizeFilters({ ...draft, ...patch }); syncScope(scope, draft); } else onChange(patch);
      });
    }
    scope.querySelectorAll('.catalog-filter__title').forEach(button => button.addEventListener('click', () => {
      const expanded = button.getAttribute('aria-expanded') !== 'true'; button.setAttribute('aria-expanded', String(expanded));
      [...button.parentElement.children].filter(child => child !== button).forEach(child => { child.hidden = !expanded; });
    }));
    for (const [id, field] of [['showMoreGenres', 'genre'], ['showMoreStores', 'store']]) {
      const button = scope.querySelector(`[data-control="${id}"]`); if (!button) continue;
      const existing = new Set([...scope.querySelectorAll(`input[name="${field}"]`)].map(input => input.value));
      const extra = doc.createElement('div'); extra.hidden = true;
      for (const [value, label] of Object.entries(FILTER_LABELS[field]).filter(([value]) => !existing.has(value))) {
        const item = doc.createElement('label'); item.className = 'catalog-check';
        const input = doc.createElement('input'); input.type = 'checkbox'; input.name = field; input.value = value;
        input.className = 'catalog-check__input'; input.checked = (draft || filters)[field].split(',').includes(value);
        const box = doc.createElement('span'); box.className = 'catalog-check__box';
        const text = doc.createElement('span'); text.textContent = label;
        item.append(input, box, text); extra.append(item);
      }
      if (!extra.children.length) { button.hidden = true; continue; }
      button.before(extra); button.dataset.field = field;
      button.addEventListener('click', () => { extra.hidden = !extra.hidden;
        button.setAttribute('aria-expanded', String(!extra.hidden)); button.textContent = extra.hidden ? 'Показати більше →' : 'Показати менше ↑'; });
      extra.addEventListener('change', () => {
        const patch = { [field]: [...scope.querySelectorAll(`input[name="${field}"]:checked`)].map(input => input.value).join(',') };
        if (draft) draft = normalizeFilters({ ...draft, ...patch }); else onChange(patch);
      });
      if ([...extra.querySelectorAll('input')].some(input => input.checked)) extra.hidden = false;
    }
  }
  bindScope(sidebar);
  get('gamesPriceFilter')?.addEventListener('change', event => {
    const preset = PRESETS[event.target.value]; if (preset) onChange({ minPrice: preset[0], maxPrice: preset[1] });
  });
  all('[data-category]').forEach(button => button.addEventListener('click', () => {
    const category = button.dataset.category;
    onChange({ genre: ['all', 'new', 'upcoming'].includes(category) ? '' : category,
      release: category === 'new' ? 'recent' : category === 'upcoming' ? 'upcoming' : '' });
  }));
  const reset = () => onChange({ ...FILTER_DEFAULTS, pageSize: filters.pageSize, view: filters.view });
  for (const id of ['clearFiltersButton', 'resetGamesFilters']) get(id)?.addEventListener('click', reset);
  for (const [id, view] of [['gridViewButton', 'grid'], ['listViewButton', 'list']]) get(id)?.addEventListener('click', () => onChange({ view }));
  get('previousPageButton')?.addEventListener('click', () => onChange({ page: Math.max(1, filters.page - 1) }));
  get('nextPageButton')?.addEventListener('click', () => onChange({ page: filters.page + 1 }));
  function close() {
    if (!draft) return;
    drawer.classList.remove('games-filter-drawer--open'); drawer.hidden = true; drawer.setAttribute('aria-hidden', 'true');
    overlay.hidden = true; get('openGamesFilters').setAttribute('aria-expanded', 'false');
    doc.body.style.overflow = previousOverflow; draft = null;
    doc.querySelector('main').inert = false;
    doc.querySelector('header').inert = false;
    previousFocus?.focus();
  }
  get('openGamesFilters')?.addEventListener('click', () => {
    draft = { ...filters }; previousFocus = doc.activeElement; previousOverflow = doc.body.style.overflow;
    mobile.replaceChildren();
    for (const section of sidebar.querySelectorAll('.catalog-filter')) {
      const clone = section.cloneNode(true);
      clone.querySelectorAll('[id]').forEach(node => { node.dataset.control ||= node.id; node.removeAttribute('id'); });
      clone.querySelectorAll('[data-field]').forEach(button => { button.previousElementSibling?.remove(); });
      mobile.append(clone);
    }
    bindScope(mobile); syncScope(mobile, draft);
    drawer.hidden = false; drawer.setAttribute('aria-hidden', 'false'); drawer.classList.add('games-filter-drawer--open');
    overlay.hidden = false; get('openGamesFilters').setAttribute('aria-expanded', 'true');
    doc.body.style.overflow = 'hidden'; get('closeGamesFilters').focus();
    doc.querySelector('main').inert = true;
    doc.querySelector('header').inert = true;
  });
  get('closeGamesFilters')?.addEventListener('click', close); overlay?.addEventListener('click', close);
  get('mobileResetFilters')?.addEventListener('click', () => { draft = { ...FILTER_DEFAULTS, pageSize: filters.pageSize, view: filters.view }; syncScope(mobile, draft); });
  get('mobileApplyFilters')?.addEventListener('click', () => {
    const patch = { ...draft, minPrice: mobile.querySelector('[data-control="priceMin"]').value,
      maxPrice: mobile.querySelector('[data-control="priceMax"]').value, page: 1 };
    close(); onChange(patch);
  });
  drawer?.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key === 'Tab') {
      const controls = [...drawer.querySelectorAll('button, input, select')].filter(node => !node.disabled && node.getClientRects().length);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && doc.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && doc.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  sync();
  return {
    sync(next) { filters = normalizeFilters(next); sync(); },
    pagination({ total, hasNext }) {
      get('previousPageButton').disabled = filters.page === 1; get('nextPageButton').disabled = !hasNext;
      const pages = get('paginationPages'); pages.replaceChildren();
      const last = Math.max(filters.page, Math.ceil(total / filters.pageSize));
      const numbers = [...new Set([1, filters.page - 1, filters.page, filters.page + 1, last])].filter(page => page >= 1 && page <= last).sort((a, b) => a - b);
      let previous = 0;
      for (const page of numbers) {
        if (previous && page - previous > 1) { const gap = doc.createElement('span'); gap.textContent = '…'; pages.append(gap); }
        const button = doc.createElement('button'); button.type = 'button'; button.className = 'pagination__pages-button';
        button.textContent = page; button.setAttribute('aria-label', `Сторінка ${page}`);
        if (page === filters.page) button.setAttribute('aria-current', 'page');
        button.addEventListener('click', () => onChange({ page })); pages.append(button); previous = page;
      }
    },
  };
}
