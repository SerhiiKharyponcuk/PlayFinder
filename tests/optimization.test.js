import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import Handlebars from 'handlebars';
import Runtime from 'handlebars/runtime.js';
import { handlebarsPlugin } from '../scripts/handlebars-plugin.js';
import { createLoadingController, siteLoading } from '../src/js/components/site-loader.js';
import { loadSection } from '../src/js/components/load-section.js';

test('Зібрані шаблони зберігають HTML, escaping і стани ціни без браузерного компілятора', async () => {
  for (const name of ['game-card', 'deal', 'game-detail']) {
    const path = fileURLToPath(new URL(`../src/templates/${name}.hbs`, import.meta.url));
    const watched = [];
    const compiled = await handlebarsPlugin().load.call({ addWatchFile: file => watched.push(file) }, path + '?template');
    assert.deepEqual(watched, [path]);
    assert.match(compiled, /import Handlebars from "handlebars\/runtime"/);
    // Виконуємо тільки код нашого компілятора, жодних даних/скриптів з API.
    const render = new Function('Handlebars', compiled.replace('import Handlebars from "handlebars/runtime";', '').replace('export default', 'return'))(Runtime);
    const original = Handlebars.compile(await readFile(path, 'utf8'));
    for (const model of [
      { id: '1', title: '<img src=x onerror=alert(1)>', image: 'https://example.com/a?x="&y=1', hasPrice: true, price: 0, formattedPrice: 'Безкоштовно', platformIcons: [{ className: 'fa-windows', label: 'PC' }] },
      { title: 'Portal', priceLoading: true, release: { isUpcoming: true, label: 'Ще не вийшла' }, offers: [{ store: 'Test & Shop', formattedPrice: '$9.99' }] },
      { title: 'GTA V', priceMessage: 'Немає пропозицій', hasPrice: false, offers: [] },
    ]) {
      const html = render(model);
      assert.equal(html, original(model));
      assert.doesNotMatch(html, /<img src=x onerror/);
    }
  }
});

test('Лоадер чекає всі секції, змінює підпис після RAWG і завершується без затримки', () => {
  const states = [];
  const controller = createLoadingController(state => states.push(state));
  const cards = controller.begin('Завантажуємо ігри…', 2);
  const deals = controller.begin('Завантажуємо пропозиції…', 2);
  cards.update('Перевіряємо ціни…', 1);
  assert.deepEqual(states.at(-1), { visible: true, label: 'Завантажуємо пропозиції…', count: 2 });
  deals.finish();
  assert.deepEqual(states.at(-1), { visible: true, label: 'Перевіряємо ціни…', count: 1 });
  cards.finish();
  assert.deepEqual(states.at(-1), { visible: false, label: '', count: 0 });
  const next = controller.begin('Новий запит');
  cards.finish(); cards.update('Старий запит');
  assert.deepEqual(states.at(-1), { visible: true, label: 'Новий запит', count: 1 });
  next.finish();
});

test('Помилка API закриває і звичайний, і прогресивний лоадер секції', async () => {
  const previousDocument = globalThis.document;
  const label = { textContent: '' };
  const site = { hidden: true, querySelector: () => label };
  const skeleton = { hidden: false, setAttribute() {} };
  const attributes = new Map();
  const container = { setAttribute: (key, value) => attributes.set(key, value) };
  globalThis.document = { getElementById: id => ({ siteLoader: site, grid: container, skeleton })[id] };
  const error = new Error('offline');
  try {
    let reported;
    await loadSection('grid', 'skeleton', async () => { throw error; }, () => assert.fail('Не рендеримо помилку'), { onError: value => { reported = value; } });
    assert.equal(reported, error);
    assert.equal(site.hidden, true);
    assert.equal(skeleton.hidden, true);
    assert.equal(attributes.get('aria-busy'), 'false');
    const task = siteLoading.begin('Завантажуємо каталог');
    assert.equal(site.hidden, false);
    await loadSection('grid', 'skeleton', async () => { throw error; }, () => {}, { track: false, onError: () => task.finish() });
    assert.equal(site.hidden, true);
  } finally { globalThis.document = previousDocument; }
});
