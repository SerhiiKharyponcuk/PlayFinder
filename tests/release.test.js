import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Handlebars from 'handlebars';
import { releaseInfo, validReleaseDate, calendarToday } from '../src/js/utils/release.js';
import { normalizeGame, createRawgProvider } from '../src/js/api/providers/rawg.js';
import { safeLink } from '../src/js/utils/urls.js';

const today = '2026-10-01';
test('Майбутня дата означає очікуваний реліз, вчора — вже вийшла, сьогодні — реліз сьогодні', () => {
  const future = releaseInfo({ releaseDate: '2026-10-05', releaseTba: false }, today);
  assert.equal(future.isUpcoming, true);
  assert.equal(future.dateTime, '2026-10-05');
  assert.match(future.dateLabel, /5 жовтня 2026/);
  assert.equal(releaseInfo({ releaseDate: '2026-09-30' }, today).status, 'released');
  assert.equal(releaseInfo({ releaseDate: today }, today).status, 'today');
  assert.equal(releaseInfo({ releaseDate: today }, today).isUpcoming, false);
  assert.equal(releaseInfo({ releaseDate: '2027-01-01' }, '2026-12-31').isUpcoming, true);
});
test('tba має пріоритет над приблизною датою, але відсутня дата без tba лишається невідомою', () => {
  const tba = releaseInfo({ releaseDate: '2025-01-01', releaseTba: true }, today);
  assert.equal(tba.isUpcoming, true);
  assert.equal(tba.dateTime, null);
  assert.equal(tba.dateLabel, 'Дату ще не оголошено');
  assert.equal(releaseInfo({ releaseDate: null, releaseTba: false }, today).status, 'unknown');
  assert.equal(releaseInfo({}, today).isUpcoming, false);
});
test('Дати перевіряємо повністю: 30 лютого не перетворюється на дату у березні', () => {
  for (const value of [null, '', 'TBA', '2026-02-30', '2026-13-01', '2026-1-01', '2026-10-01T00:00:00Z']) {
    assert.equal(validReleaseDate(value), null, String(value));
  }
  assert.equal(validReleaseDate('2024-02-29'), '2024-02-29');
  assert.equal(validReleaseDate('2025-02-29'), null);
  assert.equal(calendarToday(new Date(2026, 9, 1, 0, 1)), today);
});
test('RAWG зберігає поля релізу й деталі гри, не використовує довільний HTML description', () => {
  const game = normalizeGame({
    id: 1, name: 'Future Game', released: '2027-05-01', tba: true,
    description_raw: 'Plain text', description: '<script>unsafe()</script>',
    genres: [{ name: 'RPG' }, null], developers: [{ name: 'Studio' }], publishers: [{ name: 'Publisher' }],
    rating: 4.2, ratings_count: 100, website: 'https://example.com/',
    platforms: [null, { platform: { name: 'PC' } }],
  });
  assert.equal(game.releaseDate, '2027-05-01');
  assert.equal(game.releaseTba, true);
  assert.equal(game.description, 'Plain text');
  assert.deepEqual(game.genres, ['RPG']);
  assert.deepEqual(game.developers, ['Studio']);
  assert.deepEqual(game.platforms, ['PC']);
  assert.equal(game.ratingsCount, 100);
  assert.equal(normalizeGame({ id: 2, description: '<b>HTML only</b>' }).description, '');
});
test('Статус для картки бере вже отриманий список RAWG: додаткових запитів немає', async () => {
  let requests = 0;
  const provider = createRawgProvider({ apiKey: 'test-only', send: async () => {
    requests++; return { results: [{ id: 1, name: 'Future', released: '2027-02-01', tba: false }], count: 1 };
  } });
  const { games } = await provider.getGames();
  assert.equal(releaseInfo(games[0], today).isUpcoming, true);
  assert.equal(requests, 1);
});
test('Посилання гри й магазинів не допускають javascript:, data: або відносних URL', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,hello', '/local', 'http://example.com', null]) assert.equal(safeLink(value), '');
  assert.equal(safeLink('https://example.com/game'), 'https://example.com/game');
});
test('Картка майбутньої гри показує реліз і пропозицію до релізу, звичайна гра — без бейджа', async () => {
  const card = Handlebars.compile(await readFile(new URL('../src/templates/game-card.hbs', import.meta.url), 'utf8'));
  const upcoming = card({ title: 'Future', release: releaseInfo({ releaseDate: '2027-02-01' }, today), hasPrice: true, formattedPrice: '20 USD' });
  assert.match(upcoming, /Ще не вийшла/);
  assert.match(upcoming, /Пропозиція до релізу/);
  const released = card({ title: 'Old Game', release: releaseInfo({ releaseDate: '2020-01-01' }, today), hasPrice: true });
  assert.doesNotMatch(released, /Ще не вийшла|Пропозиція до релізу/);
});
test('Детальна картка показує реальні статус/видання/пропозиції та екранує текст API', async () => {
  const detail = Handlebars.compile(await readFile(new URL('../src/templates/game-detail.hbs', import.meta.url), 'utf8'));
  const html = detail({
    title: '<img src=x onerror=bad()>', description: '<script>bad()</script>',
    release: releaseInfo({ releaseDate: '2027-02-01' }, today),
    hasPrice: true, formattedPrice: '20 USD', priceEditionLabel: 'Enhanced',
    offers: [{ store: 'Steam', formattedPrice: '20 USD', url: safeLink('https://example.com'), best: true }],
  });
  assert.match(html, /Гра ще не вийшла/);
  assert.match(html, /Пропозиції до релізу/);
  assert.match(html, /Enhanced/);
  assert.match(html, /Найкраща ціна/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>|<img src=x/);
});
