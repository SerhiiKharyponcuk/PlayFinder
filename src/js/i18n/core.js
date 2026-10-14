import { english } from './en.js';

export const LANGUAGE_KEY = 'playfinder.language';
export const normalizeLanguage = value => value === 'en' ? 'en' : 'uk';
export const getLocale = (language = getLanguage()) => language === 'en' ? 'en-US' : 'uk-UA';

// Якщо браузер забороняє localStorage, перемикач усе одно працюватиме.
export function createLanguageStore(storage) {
  let language = 'uk';
  try { language = normalizeLanguage(storage?.getItem(LANGUAGE_KEY)); } catch {}
  const listeners = new Set();
  return {
    get: () => language,
    set(value, { persist = true } = {}) {
      const next = normalizeLanguage(value);
      if (persist) { try { storage?.setItem(LANGUAGE_KEY, next); } catch {} }
      if (language === next) return;
      language = next;
      listeners.forEach(callback => callback(next));
    },
    subscribe(callback) { listeners.add(callback); return () => listeners.delete(callback); },
  };
}
let storage;
try { storage = globalThis.localStorage; } catch {}
const languages = createLanguageStore(storage);
export const getLanguage = () => languages.get();
export const setLanguage = (value, options) => languages.set(value, options);
export const onLanguageChange = callback => languages.subscribe(callback);

const normalizeText = value => String(value).replace(/\s+/g, ' ').trim();

// У цих повідомленнях змінюється число або запит. Сам запит не перекладаємо.
function dynamicEnglish(text) {
  let match;
  if ((match = text.match(/^(\d+) (магазин|магазини|магазинів)( · PC)?$/))) return `${match[1]} ${Number(match[1]) === 1 ? 'store' : 'stores'}${match[3] || ''}`;
  if ((match = text.match(/^(\d+) (гра|гри|ігор)$/))) return `${match[1]} ${Number(match[1]) === 1 ? 'game' : 'games'}`;
  if ((match = text.match(/^(\d+) із (\d+)$/))) return `${match[1]} of ${match[2]}`;
  if ((match = text.match(/^На сторінці: (\d+) із (\d+)( · ціни завантажуються)?$/))) return `On this page: ${match[1]} of ${match[2]}${match[3] ? ' · loading prices' : ''}`;
  if ((match = text.match(/^Знайдено ігор: (\d+)( · є схожі назви)?$/))) return `Games found: ${match[1]}${match[2] ? ' · includes similar titles' : ''}`;
  if ((match = text.match(/^Обрано: (\d+)$/))) return `Selected: ${match[1]}`;
  if ((match = text.match(/^Збережено: (\d+)$/))) return `Saved: ${match[1]}`;
  if ((match = text.match(/^Сторінка (\d+)$/))) return `Page ${match[1]}`;
  if ((match = text.match(/^(\d+) оцінок у RAWG$/))) return `${match[1]} ${Number(match[1]) === 1 ? 'rating' : 'ratings'} on RAWG`;
  if ((match = text.match(/^Пошук: (.*)$/))) return `Search: ${match[1]}`;
  if ((match = text.match(/^Рік: (\d{4})(.*)$/))) return `Year: ${match[1]}${match[2]}`;
  if ((match = text.match(/^Прибрати: (.*)$/))) return `Remove: ${translateText(match[1], 'en')}`;
  if ((match = text.match(/^(.*) ×$/))) return `${translateText(match[1], 'en')} ×`;
  if ((match = text.match(/^Перейти до (.*)$/))) return `Visit ${match[1]}`;
  if ((match = text.match(/^Помилка API: (.*)$/))) return `API error: ${match[1]}`;
  if ((match = text.match(/^Картки готові · шукаємо ціни ще для (\d+) ігор…$/))) return `Cards are ready · checking prices for ${match[1]} more games…`;
  if ((match = text.match(/^Оновити через (\d+) с$/))) return `Refresh in ${match[1]} s`;
  if ((match = text.match(/^CheapShark обмежив запити\. Повторне оновлення можливе приблизно через (\d+) с\.$/))) return `CheapShark has limited requests. You can refresh again in about ${match[1]} s.`;
  if ((match = text.match(/^Оновлення цін тимчасово призупинене\. Спробуй через (\d+) с\.$/))) return `Price updates are temporarily paused. Try again in ${match[1]} s.`;
  return text;
}

export function translateText(value, language = getLanguage()) {
  const text = String(value ?? '');
  if (language !== 'en') return text;
  const key = normalizeText(text);
  const translated = english[key] ?? dynamicEnglish(key);
  if (translated === key) return text;
  const start = text.match(/^\s*/)[0], end = text.match(/\s*$/)[0];
  return start + translated + end;
}

// Зберігаємо початковий текст, щоб можна було повернути українську мову.
export function translationRecord(value, previous, key = '') {
  const current = String(value);
  if (previous && current === previous.translated) return previous;
  const source = key && normalizeText(translateText(key, 'en')) === normalizeText(current)
    ? current.match(/^\s*/)[0] + key.trim() + current.match(/\s*$/)[0] : current;
  return { source, translated: current };
}

export function formatMoney(value, currency = 'USD', language = getLanguage()) {
  return new Intl.NumberFormat(getLocale(language), { style: 'currency', currency }).format(value);
}
export function formatDate(value, { time = false, language = getLanguage() } = {}) {
  const date = typeof value === 'number' ? new Date(value) : new Date(value + 'T12:00:00Z');
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat(getLocale(language), time
    ? { dateStyle: 'short', timeStyle: 'short' }
    : { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}
