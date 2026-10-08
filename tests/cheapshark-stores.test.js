import test from 'node:test';
import assert from 'node:assert/strict';
import { createCheapsharkClient } from '../src/js/api/cheapshark-client.js';
import { createCheapsharkProvider } from '../src/js/api/providers/cheapshark.js';
import { createCardPrices } from '../src/js/services/card-prices.js';
import { getOffers } from '../src/js/services/prices-service.js';

const game = { id: '1', title: 'Grand Theft Auto V' };

test('Іконка магазину приходить з того самого кешу API; неправильні адреси не використовуються', async () => {
  let requests = 0;
  const provider = createCheapsharkProvider(createCheapsharkClient({ storage: null, interval: 0, locks: null,
    send: async (_base, path) => {
      requests++;
      if (path === 'stores') return [
        { storeID: 1, storeName: 'Steam', images: { icon: '/img/stores/icons/0.png' } },
        { storeID: '2', storeName: 'GOG', images: { icon: 'javascript:alert(1)' } },
        { storeID: '3', storeName: 'Other', images: { icon: '//other.example/img/stores/icon.png', logo: '/img/stores/logos/2.png' } },
      ];
      return { '7': { info: { title: game.title }, deals: [
        { storeID: '1', price: '20', dealID: 'steam' }, { storeID: '2', price: '10', dealID: 'gog' },
        { storeID: '3', price: '30', dealID: 'other' },
      ] } };
    } }));
  const linked = { ...game, providerIds: { cheapshark: '7' } };
  const offers = await provider.getOffers(linked);
  assert.equal(offers.find(item => item.storeId === '1').store, 'Steam');
  assert.equal(offers.find(item => item.storeId === '1').storeIcon, 'https://www.cheapshark.com/img/stores/icons/0.png');
  assert.equal(offers.find(item => item.storeId === '2').storeIcon, '');
  assert.equal(offers.find(item => item.storeId === '3').storeIcon, 'https://www.cheapshark.com/img/stores/logos/2.png');
  await provider.getOffers(linked);
  assert.equal(requests, 2);
});

test('Сервіс пропозицій після ціни картки повторно використовує той самий кеш', async () => {
  let requests = 0;
  const provider = createCheapsharkProvider(createCheapsharkClient({ storage: null, interval: 0, locks: null,
    send: async (_base, path) => {
      requests++;
      if (path === 'stores') return [{ storeID: '1', storeName: 'Steam' }];
      return { '7': { info: { title: game.title }, deals: [{ storeID: '1', price: '20', dealID: 'deal' }] } };
    } }));
  const priced = await createCardPrices(provider, { '1': '7' })(game);
  assert.equal(priced.price, 20); assert.equal(requests, 2);
  const result = await getOffers(priced, {}, [provider]);
  assert.equal(result.offers[0].price, 20);
  await getOffers(priced, {}, [provider]);
  assert.equal(requests, 2);
});
