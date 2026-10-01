import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Handlebars from 'handlebars';
import { createGamesService } from '../src/js/services/games-service.js';
import { createRawgProvider, createRawgCache, RAWG_CACHE } from '../src/js/api/providers/rawg.js';
import { createResponseCache } from '../src/js/api/response-cache.js';
import { createCheapsharkClient } from '../src/js/api/cheapshark-client.js';
import { createCheapsharkProvider } from '../src/js/api/providers/cheapshark.js';

const game = { id: '1', title: 'Portal', providerIds: { rawg: '1' } };
const result = { games: [game], total: 1, hasNext: false };
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

test('Каталог показує RAWG до завершення повільних цін; кінцевий контракт збережений', async () => {
  const prices = deferred(); const early = deferred(); let finished = false;
  const service = createGamesService({ provider: { getGames: async () => result }, priceMany: () => prices.promise });
  const complete = service.getGames({}, { onGames: early.resolve }).then(value => { finished = true; return value; });
  const first = await early.promise;
  assert.equal(first.games[0].priceStatus, 'loading');
  assert.equal(first.total, 1);
  assert.equal(finished, false);
  assert.equal(game.priceStatus, undefined); // Не змінюємо вихідні RAWG-дані.
  prices.resolve([{ ...game, priceStatus: 'ready', price: 9.99 }]);
  assert.equal((await complete).games[0].price, 9.99);
});

test('Одна секція головної не чекає іншої; ціни лишаються одним спільним пакетом', async () => {
  const slow = deferred(); const early = deferred(); let batches = 0;
  const service = createGamesService({ provider: { getGames: params => params.slow ? slow.promise : Promise.resolve(result) },
    priceMany: async games => { batches++; return games.map(game => ({ ...game, price: 10 })); } });
  const complete = service.getGameLists([{}, { slow: true }], { onList: (index, value) => early.resolve({ index, value }) });
  assert.equal((await early.promise).index, 0);
  assert.equal(batches, 0);
  slow.resolve({ games: [{ ...game, id: '2' }], total: 1 });
  const lists = await complete;
  assert.equal(batches, 1);
  assert.deepEqual(lists.map(list => list.value.games[0].id), ['1', '2']);
});

test('Збій однієї секції одразу повідомляється і не прибирає іншу', async () => {
  const errors = [];
  const service = createGamesService({ provider: { getGames: params => params.fail ? Promise.reject(Error('offline')) : Promise.resolve(result) }, priceMany: async games => games });
  const lists = await service.getGameLists([{ fail: true }, {}], { onListError: (index, error) => errors.push([index, error.message]) });
  assert.deepEqual(errors, [[0, 'offline']]);
  assert.equal(lists[0].status, 'rejected');
  assert.equal(lists[1].value.games[0].title, 'Portal');
});

test('Деталі відкриваються до цін; withPrices:false не викликає CheapShark', async () => {
  const prices = deferred(); const early = deferred(); let requests = 0;
  const service = createGamesService({ provider: { getGame: async () => game }, priceOne: () => { requests++; return prices.promise; } });
  const complete = service.getGame('1', { onGame: early.resolve });
  assert.equal((await early.promise).title, 'Portal');
  prices.resolve({ ...game, price: 10 });
  assert.equal((await complete).price, 10);
  await service.getGame('1', { withPrices: false });
  assert.equal(requests, 1);
});

test('Кеш RAWG переживає новий провайдер, не зберігає ключ і не змішує пошук/деталі', async () => {
  const storage = memoryStorage(); let now = 100000; const calls = [];
  const make = () => createRawgProvider({ apiKey: 'test-private-key',
    cache: createResponseCache({ storage, prefix: 'rawg-test:', now: () => now }),
    send: async (base, path, { query }) => { calls.push({ path, query });
      return path === 'games' ? { results: [{ id: 1, name: query.search || 'Portal' }], count: 1,
        next: 'https://api.rawg.io/api/games?page=2&key=test-private-key', previous: 'https://api.rawg.io/api/games?key=test-private-key' }
        : { id: 1, name: 'Portal' }; } });
  let provider = make();
  await Promise.all([provider.getGames(), provider.getGames()]);
  assert.equal(calls.length, 1);
  provider = make();
  await provider.getGames();
  assert.equal(calls.length, 1);
  await provider.getGames({ query: 'Portal 2' });
  assert.equal((await provider.getGames()).hasNext, true);
  await provider.getGame('1');
  assert.equal(calls.length, 3);
  for (let i = 0; i < storage.length; i++) assert.doesNotMatch(storage.key(i) + storage.getItem(storage.key(i)), /test-private-key|\bkey=/);
  now += RAWG_CACHE.list + 1;
  await provider.getGames();
  await provider.getGame('1');
  assert.equal(calls.length, 4); // Список протух, опис ще чинний.
});

test('Скасований запит RAWG не читає кеш, збої не кешуються', async () => {
  let requests = 0; let fail = true;
  const provider = createRawgProvider({ apiKey: 'test-only', send: async () => {
    requests++; if (fail) throw Error('offline'); return { results: [{ id: 1, name: 'Portal' }], count: 1 }; } });
  await assert.rejects(provider.getGames());
  fail = false;
  await provider.getGames();
  const controller = new AbortController(); controller.abort();
  await assert.rejects(provider.getGames({}, { signal: controller.signal }), { name: 'AbortError' });
  assert.equal(requests, 2);
});

test('Міграція RAWG-кешу прибирає лише старі RAWG-записи; CheapShark і Firebase не чіпає', () => {
  const storage = memoryStorage();
  storage.setItem('playfinder:rawg:v1:entry:games?', 'legacy');
  storage.setItem('playfinder:cheapshark:v2:state', 'keep-cheapshark');
  storage.setItem('firebase:user', 'keep-firebase');
  const cache = createRawgCache(storage);
  assert.equal(storage.getItem('playfinder:rawg:v1:entry:games?'), null);
  assert.equal(storage.getItem('playfinder:cheapshark:v2:state'), 'keep-cheapshark');
  assert.equal(storage.getItem('firebase:user'), 'keep-firebase');
  cache.set('games?', { results: [] });
  assert.deepEqual(createRawgCache(storage).get('games?', { ttl: 60000 }).data, { results: [] });
});

test('Права колонка показує різні gameID з найдешевшими пропозиціями, без нового запиту при F5', async () => {
  const storage = memoryStorage(); let calls = 0;
  const send = async () => { calls++; return [
    { gameID: '1', title: 'Portal', salePrice: '20', dealID: 'expensive' },
    { gameID: '1', title: 'Portal', salePrice: '10', dealID: 'cheaper' },
    { gameID: '2', title: 'Portal 2', salePrice: '5', dealID: 'sequel' },
    { gameID: '3', title: 'Portal Deluxe', salePrice: '15', dealID: 'edition' },
    { gameID: '4', title: 'Broken', salePrice: '', dealID: 'invalid' },
  ]; };
  const make = () => createCheapsharkProvider(createCheapsharkClient({ storage, send, interval: 0, locks: null }));
  const deals = await make().getDeals({ limit: 5 });
  assert.deepEqual(deals.map(deal => deal.id), ['cheaper', 'sequel', 'edition']);
  assert.equal(deals[0].price, 10);
  assert.deepEqual((await make().getDeals()).map(deal => deal.id), ['cheaper', 'sequel', 'edition']);
  assert.equal(calls, 1);
});

test('Лоадер ціни не показує неправдиве «Немає пропозицій» і зникає в кінцевому шаблоні', async () => {
  for (const [path, text] of [['game-card.hbs', 'Шукаємо ціну'], ['game-detail.hbs', 'Шукаємо актуальні пропозиції']]) {
    const template = Handlebars.compile(await readFile(new URL('../src/templates/' + path, import.meta.url), 'utf8'));
    const loading = template({ title: 'Portal', priceLoading: true, priceMessage: 'Немає пропозицій' });
    assert.match(loading, new RegExp(text));
    assert.match(loading, /aria-busy="true"/);
    assert.doesNotMatch(loading, /Немає пропозицій/);
    assert.doesNotMatch(template({ title: 'Portal', hasPrice: true, formattedPrice: '10 USD' }), new RegExp(text));
  }
});
