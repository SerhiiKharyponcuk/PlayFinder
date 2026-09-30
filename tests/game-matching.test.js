import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { titleKey, searchTitle, fallbackSearchTitle, matchGame, findGameMatch, matchedProduct } from '../src/js/services/game-matching.js';
import { createCardPrices } from '../src/js/services/card-prices.js';
import { createCheapsharkClient } from '../src/js/api/cheapshark-client.js';
import { createCheapsharkProvider } from '../src/js/api/providers/cheapshark.js';

// Реальні назви/ID з публічного пошуку CheapShark, перевірені 01.10.2026.
// Поточні ціни не фіксуємо: вони змінюються. Тести мережу не використовують.
const gtaCandidates = JSON.parse(await readFile(new URL('./fixtures/cheapshark-gta.json', import.meta.url), 'utf8'));
const candidate = external => ({ external, gameID: '10' });

test('Повні назви: апострофи, ™ до NFKD, діакритика, дефіси, крапки, & і Unicode', () => {
  for (const [a, b] of [
    ['Baldur’s Gate III', "Baldur's Gate 3"],
    ['DOOM™', 'DOOM'], ['Pokémon®', 'Pokemon'],
    ['S.T.A.L.K.E.R. 2: Heart of Chornobyl', 'STALKER 2 — Heart of Chornobyl'],
    ['L.A. Noire', 'LA Noire'], ['Ratchet & Clank', 'Ratchet and Clank'],
    ['Ｐｏｒｔａｌ　２', 'Portal 2'], ['Portal\u200B 2 (PC)', 'Portal 2'],
  ]) {
    assert.equal(titleKey(a), titleKey(b), a);
    assert.equal(matchGame({ title: a }, [candidate(b)]).gameID, '10');
  }
});

test('Відомі скорочення розгортаються, номер залишається частиною назви', () => {
  for (const [a, b] of [
    ['GTA 5', 'Grand Theft Auto V'], ['GTAV', 'Grand Theft Auto 5'],
    ['ГТА 5', 'Grand Theft Auto V'], ['GTA IV', 'Grand Theft Auto 4'],
    ['RDR2', 'Red Dead Redemption 2'], ['CS2', 'Counter-Strike 2'],
    ['CS:GO', 'Counter-Strike: Global Offensive'], ['BG3', 'Baldurs Gate III'],
    ['Civ6', "Sid Meier's Civilization VI"],
    ["Tom Clancy's Rainbow Six Siege", 'Rainbow Six Siege'],
    ['The Witcher 3: Wild Hunt', 'Witcher 3 Wild Hunt'],
  ]) assert.equal(titleKey(a), titleKey(b), a);
});

test('Не зливаємо сиквели, DLC, підзаголовки, роки, платформу і схожі слова', () => {
  for (const [base, other] of [
    ['GTA 5', 'GTA 4'], ['GTA 5', 'GTA Online'], ['Portal', 'Portal 2'],
    ['Portal 2', 'Portal 2 Soundtrack'], ['Portal 2', 'Portal 2 DLC'],
    ['Portal 2', 'Portal 2 + DLC'], ['Portal 2', 'Portal 2 Demo'],
    ['Portal 2', 'Portal 2 Season Pass'], ['Portal 2', 'Portal 2 (PS5)'],
    ['Doom', 'Doom (2016)'], ['Game 2.0', 'Game 20'],
    ['Mega Man X', 'Mega Man 10'], ['I Am Alive', '1 Am Alive'],
    ['The Crew', 'Crew'], ['Dishonored', 'Dishonored: Death of the Outsider'],
    ['The Witcher 3', 'The Witcher 3: Wild Hunt'],
  ]) assert.equal(matchGame({ title: base }, [candidate(other)]), null, `${base} / ${other}`);
});

test('Standard = база; GOTY-синоніми = те саме видання; Deluxe/Remastered — окремі', () => {
  assert.equal(matchGame({ title: 'Portal 2' }, [candidate('Portal 2 Standard Edition')]).gameID, '10');
  assert.equal(matchGame({ title: 'Game GOTY' }, [candidate('Game: Game of the Year Edition')]).gameID, '10');
  assert.equal(matchGame({ title: 'Game Deluxe' }, [candidate('Game Deluxe Edition')]).gameID, '10');
  for (const suffix of ['GOTY', 'Complete Edition', 'Deluxe', 'Premium Online Edition', 'Enhanced', 'Remastered', "Director's Cut", 'Upgrade']) {
    assert.equal(matchGame({ title: 'Game' }, [candidate('Game ' + suffix)]), null, suffix);
  }
  assert.equal(matchGame({ title: 'Game GOTY' }, [candidate('Game Complete Edition')]), null);
});

test('Реальний GTA-пошук: V/5/GTAV обирають Enhanced, а не дешеву Shark Card чи GTA IV', () => {
  for (const title of ['Grand Theft Auto V', 'Grand Theft Auto 5', 'GTA 5', 'GTAV', 'ГТА 5']) {
    assert.equal(matchGame({ title }, gtaCandidates).gameID, '298615', title);
  }
  assert.equal(matchGame({ title: 'GTA 5' }, gtaCandidates.filter(item => item.gameID !== '298615')), null);
  assert.equal(matchGame({ title: 'Grand Theft Auto V Legacy' }, gtaCandidates), null);
  assert.equal(matchGame({ title: 'Grand Theft Auto V Premium Edition' }, gtaCandidates), null);
  assert.equal(matchedProduct('Grand Theft Auto V Enhanced').priceEditionLabel, 'Enhanced');
});

test('Базова GTA має пріоритет, Enhanced — перевірений резерв, неоднозначність зупиняє вибір', () => {
  const enhanced = gtaCandidates[0];
  assert.equal(matchGame({ title: 'GTA V' }, [enhanced, candidate('Grand Theft Auto V')]).gameID, '10');
  const duplicate = { ...enhanced, gameID: '11' };
  assert.equal(findGameMatch({ title: 'GTA V' }, [enhanced, duplicate]).status, 'ambiguous');
  assert.equal(matchGame({ title: 'GTA V' }, [enhanced, duplicate]), null);
  assert.equal(matchGame({ title: 'GTA V' }, [enhanced, enhanced]).gameID, '298615');
});

test('Порожні/пошкоджені результати не є збігами; Steam ID лише уточнює повну назву', () => {
  assert.equal(matchGame({ title: '' }, [candidate('')]), null);
  assert.equal(matchGame({ title: 'Portal' }, [null, {}, { external: 'Portal', gameID: 'bad' }]), null);
  assert.equal(matchGame({ title: 'Portal' }, null), null);
  const items = [{ external: 'Portal', gameID: '1', steamAppID: '400' }, { external: 'Portal', gameID: '2', steamAppID: '999' }];
  assert.equal(matchGame({ title: 'Portal', providerIds: { steam: '400' } }, items).gameID, '1');
  assert.equal(matchGame({ title: 'Portal 2', providerIds: { steam: '400' } }, items), null);
});

test('Пошукова назва розгортає абревіатуру, звичайні RAWG-запити лишають чинний кеш', () => {
  assert.equal(searchTitle('GTA 5'), 'grand theft auto v');
  assert.equal(searchTitle('GTAV'), 'grand theft auto v');
  assert.equal(searchTitle('Grand Theft Auto 5'), 'grand theft auto v');
  assert.equal(searchTitle('Grand Theft Auto V'), 'grand theft auto v');
  assert.equal(searchTitle('Baldur’s Gate 3'), 'baldur’s gate 3');
  assert.equal(searchTitle('Portal 2'), 'portal 2');
  assert.equal(fallbackSearchTitle('Portal II'), 'portal');
  assert.equal(fallbackSearchTitle('Grand Theft Auto V'), 'grand theft auto');
  assert.equal(fallbackSearchTitle('DOOM'), '');
  assert.equal(fallbackSearchTitle('Mega Man X'), '');
});

test('Ціна GTA береться тільки для зіставленого ID та має видимий підпис Enhanced', async () => {
  const requests = [];
  const enrich = createCardPrices({
    async searchGames() { return gtaCandidates; },
    async getOffersForGames(games) {
      requests.push(...games.map(game => game.providerIds.cheapshark));
      return new Map(games.map(game => [game.id, [{ price: 25, currency: 'USD', store: 'Steam', productTitle: 'Grand Theft Auto V Enhanced' }]]));
    },
  });
  const game = await enrich({ id: '3498', title: 'Grand Theft Auto V', providerIds: { rawg: '3498' } });
  assert.deepEqual(requests, ['298615']);
  assert.equal(game.price, 25);
  assert.equal(game.priceStatus, 'ready');
  assert.equal(game.priceEditionLabel, 'Enhanced');
  assert.equal(game.priceProductTitle, 'Grand Theft Auto V Enhanced');
});

test('Один резервний пошук вирішує II/2, не приймає DLC і не повторюється після F5', async () => {
  const entries = new Map();
  const storage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) };
  const calls = [];
  const send = async (base, path, { query }) => {
    calls.push({ path, query });
    if (path === 'stores') return [{ storeID: '1', storeName: 'Steam' }];
    if (query.title === 'portal 2') return [{ external: 'Portal 2 DLC', gameID: '100' }];
    if (query.title === 'portal') return [{ external: 'Portal II', gameID: '2' }, { external: 'Portal', gameID: '1' }];
    return { '2': { info: { title: 'Portal II' }, deals: [{ dealID: 'full-game', storeID: '1', price: '20' }] } };
  };
  const make = () => createCardPrices(createCheapsharkProvider(createCheapsharkClient({ send, storage, interval: 0, locks: null })));
  const input = { id: '2', title: 'Portal 2', providerIds: { rawg: '2' } };
  const game = await make()(input);
  assert.equal(game.price, 20);
  assert.equal(game.providerIds.cheapshark, '2');
  assert.equal(calls.filter(call => call.query.title).length, 2);
  const total = calls.length;
  await make()(input);
  assert.equal(calls.length, total);
});

test('Неоднозначність не спричиняє резервних запитів; невдалий резерв не запускає цикл', async () => {
  const calls = [];
  const enrich = createCardPrices({
    async searchGames(title) { calls.push(title); return [candidate('Portal 2'), { external: 'Portal II', gameID: '20' }]; },
    async getOffersForGames() { return new Map(); },
  });
  assert.equal((await enrich({ id: '2', title: 'Portal 2' })).priceStatus, 'unmatched');
  assert.equal(calls.length, 1);
  calls.length = 0;
  const missing = createCardPrices({
    async searchGames(title) { calls.push(title); return []; },
    async getOffersForGames() { return new Map(); },
  });
  assert.equal((await missing({ id: '2', title: 'Portal 2' })).priceStatus, 'unmatched');
  assert.deepEqual(calls, ['Portal 2', 'portal']);
});

test('Одночасні GTA 5/GTAV мають спільний пошук, але кожна картка зіставляється окремо', async () => {
  let searches = 0;
  const enrich = createCardPrices({
    async searchGames() { searches++; return gtaCandidates; },
    async getOffersForGames(games) { return new Map(games.map(game => [game.id, []])); },
  });
  const games = await enrich.many([{ id: '1', title: 'GTA 5' }, { id: '2', title: 'GTAV' }]);
  assert.equal(searches, 1);
  assert.ok(games.every(game => game.providerIds.cheapshark === '298615'));
});

test('Порожній основний і резервний пошуки теж зберігаються між перезапусками', async () => {
  const entries = new Map();
  const storage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value) };
  let requests = 0;
  const send = async () => { requests++; return []; };
  const make = () => createCardPrices(createCheapsharkProvider(createCheapsharkClient({ send, storage, interval: 0, locks: null })));
  const input = { id: '200', title: 'Missing Game 2' };
  assert.equal((await make()(input)).priceStatus, 'unmatched');
  assert.equal(requests, 2);
  assert.equal((await make()(input)).priceStatus, 'unmatched');
  assert.equal(requests, 2);
});
