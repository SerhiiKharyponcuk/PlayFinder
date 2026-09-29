import { cheapsharkProvider, parsePrice } from '../api/providers/cheapshark.js';

/**
 * ПОЧНИ РОЗБІР ЦІН ІЗ ЦЬОГО ФАЙЛУ.
 * Шлях даних: gamesService → addPrice → searchGames → matchGame → getOffers.
 * Потім cards.js передає готові price/storeCount у game-card.hbs.
 *
 * ВАЖЛИВО: нижче є зіставлення назв, але ще немає повної перевірки типу товару.
 * Точна назва сама по собі НЕ доводить, що це базова гра, а не DLC чи перевидання.
 * TODO для уроку: перевірити на конкретних відповідях API тип товару і видання;
 * для неоднозначних випадків додати перевірені пари RAWG ID → CheapShark gameID.
 * Якщо вирішимо показувати лише базові ігри, потрібна окрема перевірка цього правила.
 */

// Не використовуємо includes: Portal і Portal 2, базова гра і Deluxe — різні товари.
// Нормалізація прибирає лише відмінності написання: регістр, пробіли, ™ і ®.
// Не видаляй цифри або слова Deluxe, Ultimate, DLC: вони можуть визначати інший товар.
// Двокрапки/дефіси зараз зберігаємо: різні варіанти назви можуть залишитися без збігу.
const titleKey = title => String(title).normalize('NFKC').replace(/[™®]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
export function matchGame(game, candidates) {
  // candidates — МАСИВ. У кожного результату external — назва, gameID — ID CheapShark.
  // filter збирає всі точні збіги. Беремо результат лише коли він один.
  // Нуль або кілька збігів → null. candidates[0] може виявитися доповненням!
  const matches = candidates.filter(item => item.gameID && titleKey(item.external) === titleKey(game.title));
  return matches.length === 1 ? matches[0] : null;
}

// Один сервіс для всіх карток. Кеш на 5 хвилин і максимум 3 одночасні пошуки.
// Помилка ціни не повинна приховувати саму гру. API-ключі тут не потрібні.
export function createCardPrices(provider = cheapsharkProvider) {
  const cache = new Map();
  let active = 0;
  const queue = [];
  async function limited(task) {
    if (active >= 3) await new Promise(resolve => queue.push(resolve));
    else active++;
    try { return await task(); }
    finally { const next = queue.shift(); if (next) next(); else active--; }
  }
  return async function addPrice(game) {
    // providerIds — номери гри в різних базах, НЕ ключі доступу до API.
    // Наприклад { rawg: '123', cheapshark: '789' } (номери тут вигадані).
    const key = game.providerIds?.cheapshark || titleKey(game.title);
    let entry = cache.get(key);
    if (!entry || entry.expires < Date.now()) {
      const promise = limited(async () => {
        // Якщо CheapShark ID уже записаний, довіряємо йому і пропускаємо пошук.
        // Тому вручну записуй тільки перевірений ID потрібної гри та видання.
        const match = game.providerIds?.cheapshark
          ? { gameID: game.providerIds.cheapshark }
          : matchGame(game, await provider.searchGames(game.title));
        if (!match) return { priceStatus: 'unmatched' };
        // Створюємо копію гри з ID CheapShark. RAWG ID залишається окремим.
        const linked = { ...game, providerIds: { ...game.providerIds, cheapshark: String(match.gameID) } };
        const offers = await provider.getOffers(linked);
        const valid = offers.filter(offer => offer.currency === 'USD' && parsePrice(offer.price) !== null);
        // Цей filter перевіряє тільки валюту та число. Він НЕ відсіює DLC/Deluxe.
        // Правильний товар потрібно визначити ДО обчислення мінімальної ціни.
        if (!valid.length) return { cheapsharkId: String(match.gameID), priceStatus: 'empty' };
        return {
          cheapsharkId: String(match.gameID), priceStatus: 'ready',
          // Поточний мінімум серед пропозицій вибраного товару, не історичний рекорд.
          // 0 — справжня безкоштовна пропозиція; відсутню ціну не замінюємо нулем.
          price: Math.min(...valid.map(offer => Number(offer.price))),
          // Set прибирає повтори: кілька пропозицій одного магазину рахуються як один.
          storeCount: new Set(valid.map(offer => offer.store)).size,
        };
      });
      entry = { promise, expires: Date.now() + 5 * 60 * 1000 };
      cache.set(key, entry);
      // Невдалий запит не кешуємо на 5 хвилин: наступний виклик зможе спробувати знову.
      promise.catch(() => cache.delete(key));
    }
    try {
      const summary = await entry.promise;
      return { ...game, ...summary, currency: 'USD', providerIds: {
        ...game.providerIds, ...(summary.cheapsharkId ? { cheapshark: summary.cheapsharkId } : {}),
      } };
    } catch {
      // Збій CheapShark не ламає картку RAWG. cards.js покаже повідомлення замість ціни.
      return { ...game, priceStatus: 'error' };
    }
  };
}
export const addCardPrice = createCardPrices();
