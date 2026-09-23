import test from 'node:test';
import assert from 'node:assert/strict';
import { createRawgProvider, normalizeGame } from '../src/js/api/providers/rawg.js';
import { cheapsharkProvider, parsePrice, dealUrl } from '../src/js/api/providers/cheapshark.js';

test('RAWG додає ключ в обидва endpoint-и, перекладає search і повертає наш контракт', async () => {
  const calls = [];
  const provider = createRawgProvider({ apiKey: 'test-only', send: async (base, path, options) => {
    calls.push({ path, ...options });
    return path === 'games' ? { results: [{ id: 42, name: 'Portal', platforms: [] }], count: 1, next: null } : { id: 42, name: 'Portal' };
  } });
  const result = await provider.getGames({ query: 'portal', sort: 'rating' });
  assert.equal(result.games[0].title, 'Portal');
  assert.equal(result.games[0].providerIds.rawg, '42');
  assert.equal(result.hasNext, false);
  await provider.getGame('42');
  assert.ok(calls.every(call => call.query.key === 'test-only'));
  assert.equal(calls[0].query.search, 'portal');
  assert.equal(calls[0].query.ordering, '-rating');
});

test('RAWG без ключа не відправляє запит', async () => {
  const provider = createRawgProvider({ apiKey: '', send: () => { throw new Error('network called'); } });
  await assert.rejects(provider.getGames(), /VITE_RAWG_API_KEY/);
});

test('порожня/небезпечна картинка отримує локальну заглушку', () => {
  assert.match(normalizeGame({ id: 1, background_image: 'javascript:alert(1)' }).image, /game-placeholder.svg$/);
});

test('CheapShark не порівнює випадкові ігри й не називає долари євро', async () => {
  await assert.rejects(cheapsharkProvider.getOffers({ id: '1', providerIds: {} }), /gameID/);
  await assert.rejects(cheapsharkProvider.getOffers({ id: '1' }, { currency: 'EUR' }), /USD/);
});

test('CheapShark відрізняє нульову ціну від пропущеної', () => {
  assert.equal(parsePrice('0.00'), 0);
  for (const value of ['', null, undefined, 'abc', -1]) assert.equal(parsePrice(value), null);
  assert.equal(new URL(dealUrl('abc+/=')).searchParams.get('dealID'), 'abc+/=');
});
