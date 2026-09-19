import test from 'node:test';
import assert from 'node:assert/strict';
import { getOffers } from '../src/js/services/prices-service.js';
import { request, ApiError } from '../src/js/api/http.js';

const offer = (price, extra = {}) => ({ id: String(price), gameId: 'game-1', price, currency: 'EUR', region: 'eu', edition: 'standard', ...extra });
const provider = (id, offers) => ({ id, enabled: true, getOffers: async () => offers });

test('ціни сортуються лише для тієї самої гри, валюти, регіону й видання', async () => {
  const result = await getOffers({ id: 'game-1' }, { region: 'eu', edition: 'standard' }, [
    provider('one', [offer(20), offer(0), offer(1, { currency: 'USD' }), offer(2, { gameId: 'other' }), offer(-1)]),
    provider('two', [offer(10), offer(3, { region: 'us' }), offer(4, { edition: 'deluxe' }), offer('5')]),
  ]);
  assert.deepEqual(result.offers.map(o => o.price), [0, 10, 20]);
  assert.equal(result.errors.length, 0);
});

test('часткова відмова API зберігає справні пропозиції та повідомляє про помилку', async () => {
  const result = await getOffers({ id: 'game-1' }, {}, [provider('ok', [offer(10)]), {
    id: 'failed', enabled: true, getOffers() { throw new Error('offline'); },
  }]);
  assert.equal(result.offers.length, 1);
  assert.equal(result.errors[0].provider, 'failed');
});

test('вимкнені адаптери не роблять запитів', async () => {
  const result = await getOffers({ id: 'game-1' });
  assert.deepEqual(result, { offers: [], errors: [], configured: false });
});

test('некоректний формат адаптера позначається як відмова джерела', async () => {
  const result = await getOffers({ id: 'game-1' }, {}, [provider('invalid', {})]);
  assert.equal(result.errors[0].provider, 'invalid');
});

test('JSON-клієнт кодує query та передає HTTP-помилки', async t => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url.searchParams.get('q'), 'гра & DLC');
    assert.equal(options.headers.get('Accept'), 'application/json');
    return new Response('{}', { status: 429 });
  });
  await assert.rejects(request('/api', '/games', { query: { q: 'гра & DLC' } }), error => error instanceof ApiError && error.status === 429);
});

test('JSON-клієнт обробляє порожню відповідь 204', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 204 }));
  assert.equal(await request('/api', 'games'), null);
});

test('таймаут скасовує завислий запит', async t => {
  t.mock.method(globalThis, 'fetch', async (url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  }));
  await assert.rejects(request('/api', 'games', { timeout: 10 }), { name: 'TimeoutError' });
});
