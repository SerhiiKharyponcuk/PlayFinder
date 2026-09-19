/**
 * Внутрішні формати: адаптери перетворюють відповіді кожного API на ці об'єкти.
 * @typedef {Object} Game
 * @property {string} id Канонічний ID PlayFinder, а не назва гри.
 * @property {string} title
 * @property {string} image URL обкладинки.
 * @property {string[]} platforms
 * @property {Record<string, string>} providerIds ID тієї самої гри в різних API.
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
