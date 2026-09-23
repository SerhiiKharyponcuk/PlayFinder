/**
 * ДОВІДНИК ПОЛІВ, а не база даних і не виконуваний перетворювач.
 * Коментарі @typedef описують бажаний об'єкт Game/Offer для редактора та розробника.
 * Назви title, image, platforms потрібно реально сформувати в адаптері.
 * JavaScript сам не перейменує name → title або background_image → image.
 */

/**
 * Внутрішні формати: адаптери перетворюють відповіді кожного API на ці об'єкти.
 * @typedef {Object} Game
 * @property {string} id Канонічний ID PlayFinder, а не назва гри.
 * @property {string} title
 * @property {string} image URL обкладинки.
 * @property {string[]} platforms
 * @property {Record<string, string>} providerIds ID у різних сервісах: rawg обов’язковий для каталогу, cheapshark — тільки після перевіреного зіставлення.
 *
 * @typedef {Object} Offer
 * @property {string} id
 * @property {string} gameId Канонічний ID PlayFinder.
 * @property {string} store
 * @property {number} price Число в основних одиницях валюти, не форматований текст.
 * @property {string} currency ISO-код, наприклад EUR.
 * @property {string} edition
 * @property {string} region
 * @property {string} url
 */
export {};
