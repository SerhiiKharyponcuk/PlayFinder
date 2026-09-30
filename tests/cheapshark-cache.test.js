import test from 'node:test';
import assert from 'node:assert/strict';
import { createCheapsharkClient, SHARK_CACHE } from '../src/js/api/cheapshark-client.js';
import { createCheapsharkProvider } from '../src/js/api/providers/cheapshark.js';
import { createCardPrices, matchGame } from '../src/js/services/card-prices.js';
import { ApiError } from '../src/js/api/http.js';

function memoryStorage() {
  const entries = new Map();
  return {
    get length() { return entries.size; }, key: index => [...entries.keys()][index],
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, String(value)), removeItem: key => entries.delete(key),
  };
}
function clock() {
  let time = 1_800_000_000_000;
  return { now: () => time, sleep: async ms => { time += ms; }, advance: ms => { time += ms; } };
}
const game = id => ({ id: String(id), title: 'Game ' + id, providerIds: { rawg: String(id) } });
const lookup = id => ({ info: { title: 'Game ' + id }, cheapestPriceEver: { price: '0.01' }, deals: [
  { storeID: '1', price: '20', dealID: 'first-' + id },
  { storeID: '2', price: '10', dealID: 'second-' + id },
] });
function fixtureSend(calls) {
  return async (base, path, { query }) => {
    calls.push({ path, query });
    if (path === 'stores') return [{ storeID: '1', storeName: 'Steam' }, { storeID: '2', storeName: 'GOG' }];
    if (path === 'deals') return [{ dealID: 'x', gameID: '1', title: 'Game 1', salePrice: '10', thumb: '' }];
    if (query.ids) return Object.fromEntries(query.ids.split(',').map(id => [id, lookup(id)]));
    const id = query.title.split(' ').at(-1);
    return [{ gameID: id, external: 'Game ' + id }];
  };
}
const listPolicy = { ...SHARK_CACHE.prices, validate: Array.isArray };

test('12 карток: 15 запитів із знижками; після перезапуску 0; після TTL тільки 2', async () => {
  const storage = memoryStorage(); const timing = clock(); const calls = [];
  const make = () => {
    const client = createCheapsharkClient({ storage, ...timing, send: fixtureSend(calls), locks: null });
    const provider = createCheapsharkProvider(client);
    return { client, provider, enrich: createCardPrices(provider) };
  };
  const games = Array.from({ length: 12 }, (_, i) => game(i + 1));
  let runtime = make();
  const [cards] = await Promise.all([runtime.enrich.many(games), runtime.provider.getDeals()]);
  assert.equal(calls.length, 15);
  assert.ok(cards.every(card => card.price === 10 && card.storeCount === 2));
  assert.equal(calls.filter(call => call.query.ids).length, 1);
  assert.equal(calls.find(call => call.query.ids).query.ids.split(',').length, 12);
  assert.equal(runtime.client.diagnostics().network, 15);
  // Новий клієнт/провайдер моделює F5: Map зникли, localStorage лишився.
  runtime = make();
  await Promise.all([runtime.enrich.many(games), runtime.provider.getDeals()]);
  assert.equal(calls.length, 15);
  assert.equal(runtime.client.diagnostics().network, 0);
  timing.advance(SHARK_CACHE.prices.ttl + 1);
  runtime = make();
  await Promise.all([runtime.enrich.many(games), runtime.provider.getDeals()]);
  assert.equal(calls.length, 17);
  assert.equal(runtime.client.diagnostics().network, 2);
});

test('Однакові одночасні запити мають один HTTP-виклик; порожній пошук теж кешується', async () => {
  const storage = memoryStorage(); const timing = clock(); let requests = 0;
  const send = async () => { requests++; return []; };
  let client = createCheapsharkClient({ storage, ...timing, send, locks: null });
  await Promise.all(Array.from({ length: 8 }, () => client.get('games', { title: 'absent' }, listPolicy)));
  assert.equal(requests, 1);
  client = createCheapsharkClient({ storage, ...timing, send, locks: null });
  assert.deepEqual((await client.get('games', { title: 'absent' }, listPolicy)).data, []);
  assert.equal(requests, 1);
});

test('429 зупиняє чергу, зберігає паузу після F5, не повторює запит і дає підписаний stale', async () => {
  const storage = memoryStorage(); const timing = clock(); let requests = 0;
  let fail = false;
  const send = async () => { requests++; if (fail) throw new ApiError('limited', 429, { retryAfterMs: 600000 }); return [1]; };
  let client = createCheapsharkClient({ storage, ...timing, send, interval: 0, locks: null });
  const original = await client.get('deals', {}, listPolicy);
  timing.advance(SHARK_CACHE.prices.ttl + 1); fail = true;
  const jobs = await Promise.allSettled([
    client.get('deals', {}, listPolicy), client.get('games', { title: 'new' }, listPolicy),
    client.get('stores', {}, listPolicy),
  ]);
  assert.equal(jobs[0].value.stale, true);
  assert.equal(jobs[0].value.updatedAt, original.updatedAt);
  assert.equal(jobs[1].reason.status, 429);
  assert.equal(requests, 2);
  client = createCheapsharkClient({ storage, ...timing, send, interval: 0, locks: null });
  await assert.rejects(client.get('games', { title: 'new' }, listPolicy), error => error.status === 429);
  assert.equal(requests, 2);
  timing.advance(600001); fail = false;
  await client.get('games', { title: 'new' }, listPolicy);
  assert.equal(requests, 3);
});

test('Пакет ігор розбивається по 25 ID, одна гра повторно бере індивідуальний кеш', async () => {
  const calls = []; const timing = clock();
  const client = createCheapsharkClient({ storage: memoryStorage(), ...timing, send: fixtureSend(calls), interval: 0, locks: null });
  const provider = createCheapsharkProvider(client);
  const games = Array.from({ length: 26 }, (_, i) => ({ ...game(i + 1), providerIds: { cheapshark: String(i + 1) } }));
  const result = await provider.getOffersForGames(games);
  assert.equal(result.size, 26);
  assert.equal(calls.length, 3); // 2 пакети + 1 список магазинів.
  assert.deepEqual(calls.filter(call => call.query.ids).map(call => call.query.ids.split(',').length), [25, 1]);
  const offers = await provider.getOffers(games[0]);
  assert.equal(offers[0].price, 10);
  assert.equal(calls.length, 3);
});

test('Падіння іншого пакета лишає індивідуальну збережену ціну, а не історичний мінімум', async () => {
  const storage = memoryStorage(); const timing = clock(); const calls = [];
  let client = createCheapsharkClient({ storage, ...timing, send: fixtureSend(calls), interval: 0, locks: null });
  let provider = createCheapsharkProvider(client);
  const first = { ...game(1), providerIds: { cheapshark: '1' } };
  await provider.getOffers(first);
  timing.advance(SHARK_CACHE.prices.ttl + 1);
  client = createCheapsharkClient({ storage, ...timing, send: async () => { throw new ApiError('offline', 503); }, interval: 0, locks: null });
  provider = createCheapsharkProvider(client);
  const result = await provider.getOffersForGames([first, { ...game(3), providerIds: { cheapshark: '3' } }]);
  assert.equal(result.get('1')[0].price, 10);
  assert.equal(result.get('1')[0].priceStale, true);
  assert.ok(result.get('3') instanceof Error);
  timing.advance(SHARK_CACHE.prices.maxAge + 1);
  await assert.rejects(provider.getOffers(first)); // Старіше доби більше не показуємо.
});

test('Web Locks: два клієнти/вкладки перевіряють кеш під спільним блокуванням', async () => {
  const storage = memoryStorage(); const timing = clock(); let requests = 0;
  let tail = Promise.resolve();
  const locks = { request(name, action) { const task = tail.then(action); tail = task.catch(() => {}); return task; } };
  const send = async () => { requests++; return []; };
  const a = createCheapsharkClient({ storage, ...timing, send, locks });
  const b = createCheapsharkClient({ storage, ...timing, send, locks });
  await Promise.all([a.get('stores', {}, listPolicy), b.get('stores', {}, listPolicy)]);
  assert.equal(requests, 1);
});

test('Заборонений localStorage не ламає кеш у пам’яті, зберігаються різні query', async () => {
  const storage = { getItem() { throw Error('denied'); }, setItem() { throw Error('denied'); } };
  const timing = clock(); let requests = 0;
  const client = createCheapsharkClient({ storage, ...timing, send: async () => { requests++; return []; }, locks: null });
  await client.get('games', { title: 'Portal' }, listPolicy);
  await client.get('games', { title: 'Portal' }, listPolicy);
  await client.get('games', { title: 'Portal 2' }, listPolicy);
  assert.equal(requests, 2);
});

test('Пошкоджений кеш не використовується як відповідь API', async () => {
  const storage = memoryStorage(); const timing = clock(); let requests = 0;
  storage.setItem('playfinder:cheapshark:v2:entry:stores?', '{broken JSON');
  const client = createCheapsharkClient({ storage, ...timing, send: async () => { requests++; return []; }, locks: null });
  assert.deepEqual((await client.get('stores', {}, listPolicy)).data, []);
  assert.equal(requests, 1);
});

test('Скасування одного споживача не скасовує запит для іншого', async () => {
  const timing = clock(); let finish; let requests = 0;
  const client = createCheapsharkClient({ storage: memoryStorage(), ...timing, locks: null,
    send: () => { requests++; return new Promise(resolve => { finish = resolve; }); } });
  const controller = new AbortController();
  const first = client.get('stores', {}, { ...listPolicy, signal: controller.signal });
  const second = client.get('stores', {}, listPolicy);
  controller.abort();
  await assert.rejects(first, { name: 'AbortError' });
  finish([]);
  assert.deepEqual((await second).data, []);
  assert.equal(requests, 1);
});

test('Неактивний магазин і дублі dealID не занижують поточну ціну', async () => {
  const timing = clock();
  const client = createCheapsharkClient({ storage: memoryStorage(), ...timing, interval: 0, locks: null,
    send: async (base, path) => path === 'stores'
      ? [{ storeID: '1', storeName: 'Closed', isActive: 0 }, { storeID: '2', storeName: 'Open', isActive: 1 }]
      : { '1': { info: { title: 'Game 1' }, deals: [
        { storeID: '1', price: '1', dealID: 'inactive' },
        { storeID: '2', price: '10', dealID: 'active' },
        { storeID: '2', price: '10', dealID: 'active' },
      ] } },
  });
  const offers = await createCheapsharkProvider(client).getOffers({ ...game(1), providerIds: { cheapshark: '1' } });
  assert.equal(offers.length, 1);
  assert.equal(offers[0].price, 10);
});

test('Черга розділяє запити інтервалом, навіть коли вони запущені одночасно', async () => {
  const timing = clock(); const starts = [];
  const client = createCheapsharkClient({ storage: memoryStorage(), ...timing, interval: 1200, locks: null,
    send: async () => { starts.push(timing.now()); return []; } });
  await Promise.all([1, 2, 3].map(id => client.get('games', { id }, listPolicy)));
  assert.deepEqual(starts.slice(1).map((time, i) => time - starts[i]), [1200, 1200]);
});

test('Зіставлення зберігає назви видань/DLC, але стандартизує пунктуацію; map не створює undefined', () => {
  const candidates = [null, { external: 'Game 1: Deluxe', gameID: '2' }, { external: 'Game 1 — DLC', gameID: '3' }, { external: 'Game 1', gameID: '1' }];
  assert.equal(matchGame(game(1), candidates).gameID, '1');
  assert.equal(matchGame({ title: 'Game: 1' }, candidates).gameID, '1');
  assert.equal(matchGame({ title: 'Game 1 Complete' }, candidates), null);
});

test('Перевірені пари ID пропускають пошук; повторне оновлення не лишає непозначену стару суму', async () => {
  let shouldFail = false;
  const enrich = createCardPrices({
    searchGames() { throw Error('search must not run'); },
    async getOffers() { if (shouldFail) throw new ApiError('limited', 429); return [{ price: 10, currency: 'USD', store: 'Steam' }]; },
  }, { '1': '20' });
  const original = await enrich(game(1));
  assert.equal(original.price, 10);
  shouldFail = true;
  const updated = await enrich(original);
  assert.equal(updated.price, undefined);
  assert.equal(updated.priceStatus, 'limited');
});
