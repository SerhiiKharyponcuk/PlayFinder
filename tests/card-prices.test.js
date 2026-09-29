import test from 'node:test';
import assert from 'node:assert/strict';
import { createCardPrices, matchGame } from '../src/js/services/card-prices.js';
import { platformIcons } from '../src/js/utils/platforms.js';
const game = { id: '1', title: 'Portal', providerIds: { rawg: '1' } };

test('Не змішуємо продовження, видання та неоднозначні збіги', () => {
  assert.equal(matchGame(game, [{ external: 'Portal 2', gameID: '2' }]), null);
  assert.equal(matchGame(game, [{ external: 'Portal Deluxe', gameID: '2' }]), null);
  assert.equal(matchGame(game, [{ external: 'Portal', gameID: '2' }, { external: 'Portal', gameID: '3' }]), null);
});
test('Мінімальна поточна ціна, нуль і кількість унікальних магазинів', async () => {
  let searches = 0;
  const enrich = createCardPrices({
    async searchGames() { searches++; return [{ external: 'Portal', gameID: '2' }]; },
    async getOffers() { return [
      { price: 20, currency: 'USD', store: 'Steam' },
      { price: 0, currency: 'USD', store: 'Epic' },
      { price: 30, currency: 'USD', store: 'Steam' },
      { price: null, currency: 'USD', store: 'Other' },
    ]; },
  });
  const [a, b] = await Promise.all([enrich(game), enrich(game)]);
  assert.equal(a.price, 0);
  assert.equal(a.storeCount, 2);
  assert.equal(b.providerIds.cheapshark, '2');
  assert.equal(searches, 1);
});
test('Збій цін не прибирає гру і наступний виклик може повторити запит', async () => {
  let attempts = 0;
  const enrich = createCardPrices({ async searchGames() { attempts++; throw Error('offline'); } });
  assert.equal((await enrich(game)).priceStatus, 'error');
  assert.equal((await enrich(game)).title, 'Portal');
  assert.equal(attempts, 2);
});
test('Покоління консолей об’єднуються в одну іконку', () => {
  assert.deepEqual(platformIcons(['PC', 'PlayStation 4', 'PlayStation 5', 'Xbox One']).map(x => x.label), ['Windows', 'PlayStation', 'Xbox']);
});
