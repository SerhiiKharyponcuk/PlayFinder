import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { normalizeSearchQuery, generateAliases, searchKey } from '../src/js/features/search-query.js';
import { createSearchIndex, withinEditDistance } from '../src/js/services/search-index.js';
import { createSearchService } from '../src/js/services/search-service.js';
import { createResponseCache } from '../src/js/api/response-cache.js';
import { createSearchController } from '../src/js/features/search-controller.js';
import { searchCatalogUrl } from '../src/js/features/search.js';
import { SEARCH_GAMES_LIST } from '../src/js/data/search-games.js';
import { loadSearchIndex } from '../src/js/services/search-worker-client.js';

const game = (id, name) => ({ id, name, title: name, slug: name.toLowerCase().replace(/\W+/g, '-') });
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function memoryStorage() {
  const entries = new Map();
  return { get length() { return entries.size; }, key: index => [...entries.keys()][index],
    getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, String(value)), removeItem: key => entries.delete(key) };
}
const makeCache = storage => createResponseCache({ storage, prefix: 'test:search:' });

test('Пошук: усі навчальні приклади, регістр, контрольні символи й захист від підміни видань', async () => {
  const cases = JSON.parse(await readFile(new URL('../lessons/search/cases.json', import.meta.url), 'utf8'));
  for (const sample of cases) assert.equal(normalizeSearchQuery(sample.input), sample.expected);
  assert.equal(normalizeSearchQuery('GTA IV'), 'Grand Theft Auto IV');
  assert.equal(normalizeSearchQuery('GTA 5 Enhanced'), 'Grand Theft Auto V Enhanced');
  assert.equal(normalizeSearchQuery('GTA'), 'GTA');
  assert.equal(normalizeSearchQuery('Пеф5'), 'Grand Theft Auto V');
  assert.equal(normalizeSearchQuery('гта5'), 'Grand Theft Auto V');
  assert.equal(normalizeSearchQuery(null), '');
  assert.equal(normalizeSearchQuery('A'.repeat(500)).length, 200);
  assert.equal(normalizeSearchQuery('GTA5 ' + 'A'.repeat(500)).length, 200);
  assert.equal(searchKey('Baldur’s Gate III'), searchKey("Baldur's Gate 3"));
});

test('Скорочення зберігають цифри; неоднозначні ключі не перезаписують гру', () => {
  const aliases = generateAliases([game(1, 'Portal 2'), game(2, 'Project 2'), game(3, 'Portal 3'), game(4, 'Grand Theft Auto V'), game(5, 'Grand Theft Auto IV')]);
  assert.equal(aliases.p2, undefined);
  assert.equal(aliases.portal2, 'Portal 2');
  assert.equal(aliases.portal3, 'Portal 3');
  assert.equal(aliases.gta5, 'Grand Theft Auto V');
  assert.equal(aliases.gta4, 'Grand Theft Auto IV');
  assert.equal(aliases.gta, undefined);
  assert.doesNotThrow(() => generateAliases([null, { name: '  ' }, game(6, 'Привіт 2')]));
});

test('10 000 ігор: точні назви, серії, розкладка, скорочення та помилки без змішування номерів', () => {
  const index = createSearchIndex(SEARCH_GAMES_LIST);
  assert.equal(index.size, 10000);
  assert.equal(index.find('GTA 5')[0].id, '3498');
  assert.equal(index.find('Grand Theft Auto IV')[0].id, '4459');
  assert.ok(index.find('GTA 5').every(game => !/\bIV\b/.test(game.title)));
  assert.equal(index.find('Portla 2')[0].title, 'Portal 2');
  assert.ok(index.find('Portla 2').every(game => !game.title.startsWith('Warcraft')));
  assert.equal(index.find('Wicher3')[0].id, '3328');
  assert.equal(index.find('зщкефд')[0].title, 'Portal');
  assert.equal(index.resolve('hl2'), 'Half-Life 2');
  assert.equal(index.find('witcher 3 complete')[0].title, 'The Witcher 3 Wild Hunt - Complete Edition');
  assert.deepEqual(index.find(''), []);
  assert.deepEqual(index.find('TotallyNonexistentMarmoset999999'), []);
});

test('Редакційна відстань враховує перестановку й не допускає далекі назви', () => {
  assert.equal(withinEditDistance('portla', 'portal'), true);
  assert.equal(withinEditDistance('wicher', 'witcher'), true);
  assert.equal(withinEditDistance('portal', 'postal'), true);
  assert.equal(withinEditDistance('portal', 'warcraft'), false);
  const index = createSearchIndex([game(1, 'Portal 2'), game(2, 'Project 2')]);
  assert.equal(index.resolve('p2'), 'p2');
  assert.equal(index.find('p2').length, 2);
  assert.equal(index.find('Portal 3').length, 0);
});

test('Локальні підказки завантажують базу один раз і не викликають API', async () => {
  let loads = 0, requests = 0;
  const service = createSearchService({ loadLocal: async () => { loads++; return [game(1, 'Portal 2')]; },
    provider: { getGames() { requests++; throw Error('network called'); } }, cache: makeCache(null) });
  assert.equal((await service.suggest('Portal')).source, 'local');
  assert.equal((await service.suggest('portal 2')).games[0].id, '1');
  assert.equal(await service.resolveQuery('p2'), 'Portal 2');
  assert.equal(loads, 1); assert.equal(requests, 0);
  await service.suggest('a'); await service.suggest('zz');
  assert.equal(requests, 0);
});

test('Онлайн-пошук поза базою: кеш позитивних та порожніх відповідей переживає перезапуск', async () => {
  const storage = memoryStorage(); let requests = 0;
  const provider = { async getGames(params) {
    requests++; assert.equal(params.searchRelevance, true); assert.equal(params.pageSize, 8);
    return { games: params.query.includes('12345') ? [game(987, 'New Adventure 12345')] : [] };
  } };
  const make = () => createSearchService({ loadLocal: async () => [], provider, cache: makeCache(storage) });
  assert.equal((await make().suggest('New Adventure 12345')).games.length, 1);
  assert.equal((await make().suggest('new adventure 12345')).games.length, 1);
  await make().suggest('No Known Adventure'); await make().suggest('No Known Adventure');
  assert.equal(requests, 2);
});

test('Спільний запит: скасування однієї форми не зриває підказки іншої', async () => {
  const response = deferred(), started = deferred(); let requests = 0, requestSignal;
  const service = createSearchService({ loadLocal: async () => [], cache: makeCache(null), provider: { getGames(_params, { signal }) {
    requests++; requestSignal = signal; started.resolve(); return response.promise;
  } } });
  const first = new AbortController();
  const a = service.suggest('New Adventure', { signal: first.signal });
  const b = service.suggest('New Adventure');
  const rejected = assert.rejects(a, { name: 'AbortError' });
  await started.promise; first.abort();
  await rejected; assert.equal(requestSignal.aborted, false);
  response.resolve({ games: [game(1, 'New Adventure')] });
  assert.equal((await b).games.length, 1); assert.equal(requests, 1);
});

test('Скасування останнього споживача перериває непотрібний онлайн-запит', async () => {
  const started = deferred(); let requestSignal;
  const service = createSearchService({ loadLocal: async () => [], cache: makeCache(null), provider: { getGames(_params, { signal }) {
    requestSignal = signal; started.resolve(); return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
  } } });
  const controller = new AbortController();
  const pending = service.suggest('New Adventure', { signal: controller.signal });
  const rejected = assert.rejects(pending, { name: 'AbortError' });
  await started.promise; controller.abort(); await rejected;
  assert.equal(requestSignal.aborted, true);
});

test('429 призупиняє нові онлайн-запити після перезапуску; локальна база лишається доступною', async () => {
  let time = Date.now(), requests = 0; const storage = memoryStorage();
  const make = () => createSearchService({ loadLocal: async () => [game(1, 'Portal')], cache: makeCache(storage), now: () => time,
    provider: { async getGames() { requests++; throw Object.assign(Error('limited'), { status: 429, retryAfterMs: 600000 }); } } });
  assert.equal((await make().suggest('Unknown Adventure 12345')).unavailable, true);
  assert.equal((await make().suggest('Different Adventure 12345')).unavailable, true);
  assert.equal((await make().suggest('Portal')).games.length, 1);
  assert.equal(requests, 1);
  time += 600001; await make().suggest('Different Adventure 12345'); assert.equal(requests, 2);
});

test('Збій локального модуля не блокує онлайн-пошук', async () => {
  const service = createSearchService({ loadLocal: async () => { throw Error('chunk unavailable'); }, cache: makeCache(null),
    provider: { getGames: async () => ({ games: [game(1, 'New Adventure')] }) } });
  assert.equal((await service.suggest('New Adventure')).games[0].title, 'New Adventure');
});

function timers() {
  let id = 0; const tasks = new Map();
  return { tasks, setTimer: callback => { tasks.set(++id, callback); return id; }, clearTimer: id => tasks.delete(id) };
}
test('Debounce виконує тільки останній текст; короткий запит і закриття скасовують роботу', async () => {
  const timing = timers(), states = [], requests = [];
  const controller = createSearchController({ ...timing, onState: state => states.push(state), search: async query => { requests.push(query); return { games: [] }; } });
  controller.update('por'); controller.update('portal');
  assert.equal(timing.tasks.size, 1); assert.equal(requests.length, 0);
  await [...timing.tasks.values()][0](); assert.deepEqual(requests, ['portal']);
  controller.update('other'); controller.update('a');
  assert.equal(timing.tasks.size, 0); assert.equal(states.at(-1).status, 'idle');
  controller.update('other'); controller.cancel(); assert.equal(timing.tasks.size, 0);
});

test('Стара повільна відповідь не замінює результати нового запиту навіть без підтримки AbortSignal', async () => {
  const timing = timers(), old = deferred(), states = [];
  const controller = createSearchController({ ...timing, onState: state => states.push(state),
    search: query => query === 'old' ? old.promise : Promise.resolve({ games: [game(1, 'new')] }) });
  controller.update('old'); const oldRun = [...timing.tasks.values()].at(-1)();
  controller.update('new'); await [...timing.tasks.values()].at(-1)();
  old.resolve({ games: [game(2, 'old')] }); await oldRun;
  assert.equal(states.at(-1).query, 'new'); assert.equal(states.at(-1).games[0].name, 'new');
});

test('Каталог зберігає фільтри та безпечно кодує запит; новий пошук скидає сторінку', () => {
  const url = new URL(searchCatalogUrl('GTA 5', { page: 'games', search: '?platform=pc&genre=rpg&page=3' }), 'https://example.test/PlayFinder/');
  assert.equal(url.searchParams.get('q'), 'Grand Theft Auto V');
  assert.equal(url.searchParams.get('platform'), 'pc'); assert.equal(url.searchParams.get('genre'), 'rpg'); assert.equal(url.searchParams.has('page'), false);
  assert.equal(searchCatalogUrl(''), './games.html');
  assert.equal(new URL(searchCatalogUrl('Tom & Jerry?'), 'https://example.test/').searchParams.get('q'), 'Tom & Jerry?');
});

test('Браузер без Worker використовує локальний індекс без API', async () => {
  const index = await loadSearchIndex();
  assert.equal((await index.find('GTA 5'))[0].id, '3498');
  assert.equal(await index.resolve('hl2'), 'Half-Life 2');
});

test('Падіння Worker після запуску переводить поточний запит на локальний запасний шлях', async () => {
  const previous = globalThis.Worker; let terminated = false;
  globalThis.Worker = class {
    handlers = new Map();
    constructor() { queueMicrotask(() => this.handlers.get('message')({ data: { ready: true } })); }
    addEventListener(name, callback) { this.handlers.set(name, callback); }
    terminate() { terminated = true; }
    postMessage() { this.handlers.get('error')({ preventDefault() {} }); }
  };
  try {
    const index = await loadSearchIndex();
    assert.equal((await index.find('GTA 5'))[0].id, '3498');
    assert.equal(await index.resolve('hl2'), 'Half-Life 2');
    assert.equal(terminated, true);
  } finally { if (previous === undefined) delete globalThis.Worker; else globalThis.Worker = previous; }
});
