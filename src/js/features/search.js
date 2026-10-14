import { updateFilterSearch } from './catalog-state.js';
import { normalizeSearchQuery } from './search-query.js';
import { createSearchController } from './search-controller.js';
import { searchService } from '../services/search-service.js';
import { safeImage } from '../utils/urls.js';

const initialized = new WeakSet();

export function searchCatalogUrl(value, { page = '', search = '' } = {}) {
  return './games.html' + updateFilterSearch(page === 'games' ? search : '', { query: normalizeSearchQuery(value) });
}

function appendTitle(element, title, query, doc) {
  const index = title.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0 || !query) { element.textContent = title; return; }
  const mark = doc.createElement('mark'); mark.textContent = title.slice(index, index + query.length);
  element.append(doc.createTextNode(title.slice(0, index)), mark, doc.createTextNode(title.slice(index + query.length)));
}

export function initSearch({ root = document, service = searchService, navigate = url => location.assign(url) } = {}) {
  const doc = root.ownerDocument || root;
  const widgets = [];
  const catalogUrl = value => searchCatalogUrl(value, { page: doc.body.dataset.page, search: globalThis.location?.search || '' });
  const sync = (value, source) => widgets.forEach(widget => {
    if (widget.input !== source) widget.setValue(value);
    widget.clear.hidden = !value;
  });

  for (const id of ['headerSearchForm', 'mobileSearchForm']) {
    const form = root.getElementById(id);
    const input = form?.querySelector('input');
    if (!input || initialized.has(form)) continue;
    initialized.add(form);
    input.maxLength = 200;
    input.placeholder = 'Пошук за назвою гри…';
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('autocapitalize', 'none');
    input.setAttribute('enterkeyhint', 'search');
    input.spellcheck = false;
    if (doc.body.dataset.page === 'games') input.value = normalizeSearchQuery(new URLSearchParams(globalThis.location?.search || '').get('q'));
    const popup = form.querySelector('.search-results') || doc.createElement('div');
    popup.className = 'search-results';
    popup.id ||= id === 'headerSearchForm' ? 'searchResults' : 'mobileSearchResults';
    popup.hidden = true;
    const status = doc.createElement('p'); status.className = 'search-results__status';
    status.id = input.id + '-status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    const list = doc.createElement('div'); list.className = 'search-results__list'; list.id = input.id + '-listbox';
    list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', 'Знайдені ігри');
    const all = doc.createElement('a'); all.className = 'search-results__all'; all.tabIndex = -1;
    all.textContent = 'Показати всі результати →';
    popup.replaceChildren(status, list, all);
    if (!popup.parentElement) form.append(popup);
    const clear = doc.createElement('button'); clear.type = 'button'; clear.className = 'search-clear';
    clear.textContent = '×'; clear.setAttribute('aria-label', 'Очистити пошук'); clear.hidden = !input.value;
    form.append(clear);
    input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-haspopup', 'listbox'); input.setAttribute('aria-controls', list.id);
    input.setAttribute('aria-expanded', 'false'); input.setAttribute('aria-describedby', status.id);

    let options = [], selected = -1, composing = false, pendingArrow = 0, submitting = false, inputRevision = 0;
    const select = index => {
      selected = index;
      options.forEach((option, i) => option.setAttribute('aria-selected', String(i === selected)));
      if (selected < 0) input.removeAttribute('aria-activedescendant');
      else {
        input.setAttribute('aria-activedescendant', options[selected].id);
        options[selected].scrollIntoView({ block: 'nearest' });
      }
    };
    const hide = () => {
      popup.hidden = true; form.classList.remove('search-open'); input.setAttribute('aria-expanded', 'false');
      input.setAttribute('aria-busy', 'false'); pendingArrow = 0; select(-1);
      status.textContent = '';
    };
    const show = state => {
      options = []; selected = -1; input.removeAttribute('aria-activedescendant'); list.replaceChildren();
      if (state.status === 'idle') { hide(); return; }
      popup.hidden = false; form.classList.add('search-open');
      input.setAttribute('aria-expanded', 'true'); input.setAttribute('aria-busy', String(state.status === 'loading'));
      status.classList.toggle('search-results__status--loading', state.status === 'loading');
      all.href = catalogUrl(state.resolvedQuery || state.query);
      if (state.status === 'loading') status.textContent = 'Шукаємо ігри…';
      else if (state.status === 'error' || state.unavailable) status.textContent = 'Підказки тимчасово недоступні. Можна виконати пошук у каталозі.';
      else if (!state.games.length) status.textContent = state.refine ? 'Введи щонайменше 3 символи для ширшого пошуку.' : 'Не знайдено збігів. Спробуй іншу назву або пошук у каталозі.';
      else status.textContent = `Знайдено ігор: ${state.games.length}${state.games.some(game => game.approximate) ? ' · є схожі назви' : ''}`;
      for (const [index, game] of state.games.entries()) {
        const option = doc.createElement('a'); option.className = 'search-result'; option.tabIndex = -1;
        option.id = `${input.id}-option-${index}`; option.href = './game.html?id=' + encodeURIComponent(game.id);
        option.setAttribute('role', 'option'); option.setAttribute('aria-selected', 'false');
        if (game.image) {
          const image = doc.createElement('img'); image.className = 'search-result__image'; image.src = safeImage(game.image);
          image.alt = ''; image.width = 40; image.height = 40; image.loading = 'lazy'; image.decoding = 'async';
          image.addEventListener('error', () => { image.src = safeImage(''); }, { once: true }); option.append(image);
        } else {
          const icon = doc.createElement('span'); icon.className = 'search-result__icon'; icon.setAttribute('aria-hidden', 'true');
          const glyph = doc.createElement('i'); glyph.className = 'fa-solid fa-gamepad'; icon.append(glyph); option.append(icon);
        }
        const content = doc.createElement('span'); content.className = 'search-result__content';
        const title = doc.createElement('strong'); title.className = 'search-result__title'; appendTitle(title, game.title, state.query, doc);
        const meta = doc.createElement('span'); meta.className = 'search-result__meta';
        meta.textContent = game.approximate ? 'Схожа назва · відкрити гру' : 'Відкрити гру';
        content.append(title, meta); option.append(content); list.append(option); options.push(option);
        option.addEventListener('pointerdown', event => { if (event.pointerType === 'mouse') event.preventDefault(); });
        option.addEventListener('pointermove', () => select(index));
      }
      if (pendingArrow && options.length) { select(pendingArrow === 1 ? 0 : options.length - 1); pendingArrow = 0; }
    };
    const controller = createSearchController({ search: (query, options) => service.suggest(query, options), onState: show });
    const close = () => { controller.cancel(); hide(); };
    const update = immediate => {
      widgets.forEach(widget => { if (widget.input !== input) widget.close(); });
      controller.update(input.value, { immediate });
    };
    widgets.push({ input, clear, close, setValue(value) { if (input.value !== value) { inputRevision++; input.value = value; } } });
    input.addEventListener('input', () => {
      inputRevision++;
      sync(input.value, input);
      if (!composing) update(false);
    });
    input.addEventListener('compositionstart', () => { composing = true; close(); });
    input.addEventListener('compositionend', () => { composing = false; sync(input.value, input); update(false); });
    input.addEventListener('focus', () => { if (normalizeSearchQuery(input.value).length >= 2) update(true); });
    input.addEventListener('keydown', event => {
      if (composing || event.isComposing || event.keyCode === 229) return;
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key === 'Tab') { close(); return; }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        if (normalizeSearchQuery(input.value).length < 2) return;
        event.preventDefault();
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        if (popup.hidden) { update(true); pendingArrow = direction; }
        else if (options.length) select(selected < 0 ? (direction === 1 ? 0 : options.length - 1) : (selected + direction + options.length) % options.length);
        else pendingArrow = direction;
      }
    });
    form.addEventListener('focusout', event => { if (!form.contains(event.relatedTarget)) close(); });
    doc.addEventListener('pointerdown', event => { if (!form.contains(event.target)) close(); });
    clear.addEventListener('click', () => { inputRevision++; input.value = ''; sync('', input); close(); input.focus(); });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (composing || submitting) return;
      const selectedUrl = !popup.hidden && selected >= 0 ? options[selected].getAttribute('href') : null;
      const query = normalizeSearchQuery(input.value), current = inputRevision;
      close();
      if (selectedUrl) { navigate(selectedUrl); return; }
      submitting = true;
      try {
        const resolved = service.resolveQuery ? await service.resolveQuery(query) : query;
        if (inputRevision === current) { sync(resolved); navigate(catalogUrl(resolved)); }
      } finally { submitting = false; }
    });
  }
  return () => widgets.forEach(widget => widget.close());
}
