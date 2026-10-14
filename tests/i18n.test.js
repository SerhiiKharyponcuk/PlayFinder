import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createLanguageStore, LANGUAGE_KEY, translateText, translationRecord, formatMoney, formatDate } from '../src/js/i18n/core.js';

test('Мова зберігається між сторінками; невідоме значення повертає українську', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) };
  const first = createLanguageStore(storage);
  assert.equal(first.get(), 'uk');
  first.set('en');
  assert.equal(values.get(LANGUAGE_KEY), 'en');
  assert.equal(createLanguageStore(storage).get(), 'en');
  values.set(LANGUAGE_KEY, '<script>');
  assert.equal(createLanguageStore(storage).get(), 'uk');
});

test('Заборонений localStorage не блокує переклад; оновлення з іншої вкладки не записується повторно', () => {
  const store = createLanguageStore({ getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } });
  const changes = [];
  const unsubscribe = store.subscribe(value => changes.push(value));
  store.set('en'); store.set('en'); store.set('uk', { persist: false });
  assert.deepEqual(changes, ['en', 'uk']);
  unsubscribe(); store.set('en');
  assert.deepEqual(changes, ['en', 'uk']);
});

test('Кількості, повідомлення пошуку та фільтри перекладаються без зміни запиту', () => {
  assert.equal(translateText('1 магазин · PC', 'en'), '1 store · PC');
  assert.equal(translateText('12 магазинів · PC', 'en'), '12 stores · PC');
  assert.equal(translateText('0 ігор', 'en'), '0 games');
  assert.equal(translateText('1 гра', 'en'), '1 game');
  assert.equal(translateText('7 із 8', 'en'), '7 of 8');
  assert.equal(translateText('На сторінці: 12 із 12 · ціни завантажуються', 'en'), 'On this page: 12 of 12 · loading prices');
  assert.equal(translateText('Знайдено ігор: 4 · є схожі назви', 'en'), 'Games found: 4 · includes similar titles');
  assert.equal(translateText('Прибрати: Пошук: Ігри ×', 'en'), 'Remove: Search: Ігри ×');
  assert.equal(translateText('Картки готові · шукаємо ціни ще для 2 ігор…', 'en'), 'Cards are ready · checking prices for 2 more games…');
  assert.equal(translateText('Оновити через 30 с', 'en'), 'Refresh in 30 s');
  assert.equal(translateText('CheapShark обмежив запити. Повторне оновлення можливе приблизно через 300 с.', 'en'),
    'CheapShark has limited requests. You can refresh again in about 300 s.');
});

test('Повернення української зберігає вихідний текст; нове повідомлення не замінюється старим', () => {
  const first = translationRecord('  Вхід  ');
  first.translated = translateText(first.source, 'en');
  const next = translationRecord(first.translated, first);
  assert.equal(translateText(next.source, 'uk'), '  Вхід  ');
  const changed = translationRecord('Створити акаунт', first);
  assert.equal(translateText(changed.source, 'en'), 'Create account');
  assert.equal(translationRecord(' Your ', undefined, 'Твоє').source, ' Твоє ');
});

test('Переклад не додає HTML і не змінює невідомі назви ігор', () => {
  assert.equal(translateText('Baldur’s Gate 3', 'en'), 'Baldur’s Gate 3');
  assert.equal(translateText('<img src=x onerror=alert(1)>', 'en'), '<img src=x onerror=alert(1)>');
  assert.equal(translateText('Від', 'uk'), 'Від');
});

test('Нульова ціна і дата форматуються відповідно до мови', () => {
  assert.equal(formatMoney(0, 'USD', 'en'), '$0.00');
  assert.equal(formatMoney(19.99, 'USD', 'en'), '$19.99');
  assert.match(formatMoney(19.99, 'USD', 'uk'), /19,99/);
  assert.equal(formatDate('2027-05-02', { language: 'en' }), 'May 2, 2027');
  assert.match(formatDate('2027-05-02', { language: 'uk' }), /травня/);
});

function decode(value) {
  return value.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ');
}
test('Усі позначені статичні тексти мають англійський переклад, перемикач є на кожній сторінці', async () => {
  for (const page of ['index', 'games', 'about', 'game', 'login', 'favorites', 'privacy', 'terms']) {
    const html = await readFile(new URL('../' + page + '.html', import.meta.url), 'utf8');
    assert.match(html, /data-language-switch/, page);
    for (const match of html.matchAll(/>([^<>]+)</g)) {
      const source = decode(match[1]).replace(/\s+/g, ' ').trim();
      if (/[а-яіїєґ]/i.test(source)) assert.notEqual(translateText(source, 'en'), source, `${page}: ${source}`);
    }
  }
});
