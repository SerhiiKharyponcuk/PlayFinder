import test from 'node:test';
import assert from 'node:assert/strict';
import { readFilters, updateFilterSearch, initFilters } from '../src/js/features/filters.js';
import { normalizeYear } from '../src/js/api/rawg-filters.js';
import { createRawgProvider } from '../src/js/api/providers/rawg.js';
import { createResponseCache } from '../src/js/api/response-cache.js';
import { FILTER_DEFAULTS, selectCatalogGames } from '../src/js/features/catalog-state.js';
import { releaseDates } from '../src/js/api/rawg-filters.js';

test('URL читає жанр і сортування, відсіює невідомі значення й некоректну сторінку', () => {
  assert.deepEqual(readFilters('?q=%20Portal%20&genre=rpg&sort=newest&page=2'), { ...FILTER_DEFAULTS, query: 'Portal', genre: 'rpg', sort: 'release', page: 2 });
  for (const genre of ['__proto__', 'constructor', 'unknown', '5']) assert.equal(readFilters('?genre=' + genre).genre, '');
  for (const page of ['-1', '0', '1.5', 'abc', '99999999999999999999']) assert.equal(readFilters('?page=' + page).page, 1);
  assert.equal(readFilters('?sort=price-low').sort, 'price-low');
});

test('Множинні фільтри, нульова ціна та вигляд зберігаються у URL; небезпечні значення відсіюються', () => {
  const search = updateFilterSearch('?q=Portal&page=3', { platform: 'pc,xbox,pc,constructor',
    genre: 'horror,co-op,rpg', store: 'steam,gog', minPrice: 0, maxPrice: 0, pageSize: 24, view: 'list' });
  const filters = readFilters(search);
  assert.equal(filters.platform, 'pc,xbox'); assert.equal(filters.genre, 'co-op,horror,rpg');
  assert.equal(filters.maxPrice, 0); assert.equal(filters.minPrice, 0); assert.equal(filters.page, 1);
  assert.equal(filters.pageSize, 24); assert.equal(filters.view, 'list'); assert.equal(filters.query, 'Portal');
  assert.equal(readFilters('?min=20&max=10').minPrice, 10);
  assert.equal(readFilters('?min=abc&max=-1').maxPrice, null);
  assert.equal(readFilters('?size=48').pageSize, 40);
  assert.equal(readFilters(updateFilterSearch('?genre=rpg&page=4', { view: 'list' })).page, 4);
  assert.equal(readFilters(updateFilterSearch(search, { page: 3 })).page, 3);
});

test('Відбір цін чекає завершення завантаження, не плутає 0 з відсутньою ціною і не змінює вихідний список', () => {
  const games = [{ id: '1', price: 10 }, { id: '2', price: 0 }, { id: '3' }, { id: '4', price: 20 }];
  assert.deepEqual(selectCatalogGames(games, readFilters('?sort=price-high')).map(game => game.id), ['4', '1', '2', '3']);
  assert.deepEqual(selectCatalogGames(games, readFilters('?max=0')).map(game => game.id), ['2']);
  assert.deepEqual(selectCatalogGames(games, readFilters('?min=10&max=20')).map(game => game.id), ['1', '4']);
  const pending = [{ id: '1', priceStatus: 'loading' }];
  assert.equal(selectCatalogGames(pending, readFilters('?max=0')), pending);
  assert.deepEqual(games.map(game => game.id), ['1', '2', '3', '4']);
});

test('Жанри/теги, платформи та магазини передаються разом; локальна ціна не змінює ключ кешу RAWG', async () => {
  const calls = [];
  const provider = createRawgProvider({ apiKey: 'test-only', cache: createResponseCache({ storage: null }),
    send: async (_base, _path, { query }) => { calls.push(query); return { results: [], count: 0 }; } });
  const filters = readFilters('?genre=rpg,co-op,horror&platform=pc,xbox&store=steam,gog&year=2024&size=24');
  await provider.getGames(filters);
  await provider.getGames({ ...filters, minPrice: 10, sort: 'price-low' });
  assert.equal(calls.length, 1); assert.equal(String(calls[0].genres), '5');
  assert.equal(calls[0].tags, '18,16'); assert.equal(calls[0].parent_platforms, '1,3');
  assert.equal(calls[0].stores, '5,1'); assert.equal(calls[0].page_size, 24);
  assert.equal(calls[0].dates, '2024-01-01,2024-12-31');
});

test('Рік перетинається з категорією релізу; несумісні дати не створюють мережевий запит', async () => {
  assert.equal(releaseDates({ year: '2024', release: 'upcoming' }, '2026-10-04').empty, true);
  assert.equal(releaseDates({ release: 'upcoming' }, '2026-12-31').dates, '2027-01-01,2100-12-31');
  assert.equal(releaseDates({ year: '2026', release: 'recent' }, '2026-10-04').dates, '2026-07-06,2026-10-04');
  const provider = createRawgProvider({ apiKey: 'test-only', send: () => { throw Error('network called'); } });
  assert.deepEqual(await provider.getGames({ year: '1900', release: 'upcoming' }), { games: [], total: 0, hasNext: false });
});

test('Пошук RAWG підтримує точний збіг, релевантність і обмеження розміру сторінки', async () => {
  let query;
  const provider = createRawgProvider({ apiKey: 'test-only', cache: createResponseCache({ storage: null }),
    send: async (_base, _path, options) => { query = options.query; return { results: [], count: 0 }; } });
  await provider.getGames({ query: 'POSTAL 2', searchRelevance: true, pageSize: 6 });
  assert.equal(query.search, 'POSTAL 2'); assert.equal(query.search_precise, true);
  assert.equal(query.ordering, undefined); assert.equal(query.page_size, 6);
  await provider.getGames({ pageSize: 48 });
  assert.equal(query.page_size, 40);
});

test('Зміна жанру зберігає пошук, сортування і рік, скидає сторінку; «Усі» прибирає тільки жанр', () => {
  let search = updateFilterSearch('?q=Grand+Theft+Auto&sort=rating&year=2024&page=3', { genre: 'rpg' });
  let params = new URLSearchParams(search);
  assert.equal(params.get('q'), 'Grand Theft Auto');
  assert.equal(params.get('sort'), 'rating');
  assert.equal(params.get('year'), '2024');
  assert.equal(params.get('genre'), 'rpg');
  assert.equal(params.has('page'), false);
  search = updateFilterSearch(search, { genre: '' });
  params = new URLSearchParams(search);
  assert.equal(params.has('genre'), false);
  assert.equal(params.get('q'), 'Grand Theft Auto');
  assert.equal(updateFilterSearch('?genre=rpg', { genre: '' }), '');
  assert.equal(new URLSearchParams(updateFilterSearch('', { query: 'Tom & Jerry?', sort: 'newest' })).get('q'), 'Tom & Jerry?');
});

test('Рік не приймає довільний діапазон дат і зайві символи', () => {
  for (const value of ['2024', '2015', 2026]) assert.equal(normalizeYear(value), String(value));
  for (const value of ['', null, '2024-01-01,2025-12-31', '20ab', '1899', '2101']) assert.equal(normalizeYear(value), '');
});

test('Списки відновлюють вибір з URL; жанр і обидва сортування викликають потрібну зміну', () => {
  const controls = new Map(['gamesGenreFilter', 'gamesSortFilter', 'mobileGamesSort', 'gamesYearFilter'].map(id => [id,
    { value: '', handlers: {}, addEventListener(type, callback) { this.handlers[type] = callback; } }]));
  const patches = [];
  initFilters(readFilters('?genre=rpg&sort=release'), { root: { getElementById: id => controls.get(id) }, onChange: patch => patches.push(patch) });
  assert.equal(controls.get('gamesGenreFilter').value, 'rpg');
  assert.equal(controls.get('gamesSortFilter').value, 'newest');
  assert.equal(controls.get('mobileGamesSort').value, 'newest');
  controls.get('gamesGenreFilter').handlers.change({ target: { value: 'strategy' } });
  controls.get('mobileGamesSort').handlers.change({ target: { value: 'rating' } });
  assert.deepEqual(patches, [{ genre: 'strategy' }, { sort: 'rating' }]);
});

test('RAWG отримує ID жанру; кеш різних жанрів окремий, повторний запит читає кеш', async () => {
  const calls = [];
  const provider = createRawgProvider({ apiKey: 'test-only', cache: createResponseCache({ storage: null }),
    send: async (_base, _path, { query }) => { calls.push(query); return { results: [], count: 0 }; } });
  await provider.getGames({ query: 'Witcher', genre: 'rpg', sort: 'newest' });
  await provider.getGames({ query: 'Witcher', genre: 'strategy', sort: 'newest' });
  await provider.getGames({ query: 'Witcher', genre: 'rpg', sort: 'release' });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].genres, 5);
  assert.equal(calls[1].genres, 10);
  assert.equal(calls[0].search, 'Witcher');
  assert.equal(calls[0].ordering, '-released');
  await provider.getGames({ genre: 'constructor' });
  assert.equal(calls[2].genres, undefined);
});
