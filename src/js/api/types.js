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
 * @property {string|null} releaseDate Дата RAWG released у YYYY-MM-DD; null не означає майбутній реліз.
 * @property {boolean} releaseTba RAWG tba: дату ще не оголошено.
 * @property {string[]} genres
 * @property {string[]} developers
 * @property {string[]} publishers
 * @property {number|null} rating Оцінка RAWG від 0 до 5, якщо вона є.
 * @property {number} ratingsCount Кількість оцінок RAWG.
 * @property {string} description description_raw із докладного RAWG endpoint; текст, не HTML.
 * @property {string} website Адреса сайту гри; перед показом перевіряється протокол.
 * @property {number} [price] Найнижча поточна PC-ціна з CheapShark. Відсутня, якщо пропозицій немає; 0 означає безкоштовно.
 * @property {string} [currency] USD для CheapShark.
 * @property {number} [storeCount] Кількість унікальних магазинів із поточними пропозиціями.
 * @property {'ready'|'unmatched'|'empty'|'error'|'limited'} [priceStatus] Результат завантаження ціни.
 * @property {boolean} [priceStale] true — API недоступний, показуємо стару збережену ціну з підписом.
 * @property {number} [priceUpdatedAt] Час останньої успішної відповіді з цінами (Unix, мілісекунди).
 * @property {string} [priceProductTitle] Повна назва зіставленого товару CheapShark.
 * @property {string} [priceEditionLabel] Підпис видання біля ціни (наприклад Enhanced), якщо він є в назві товару.
 * @property {Record<string, string>} providerIds ID у різних сервісах: rawg обов’язковий для каталогу, cheapshark — тільки після перевіреного зіставлення.
 *
 * @typedef {Object} Offer
 * @property {string} id
 * @property {string} gameId Канонічний ID PlayFinder.
 * @property {string} [productTitle] Назва товару, який реально продається за цією ціною.
 * @property {string} store
 * @property {number} price Число в основних одиницях валюти, не форматований текст.
 * @property {string} currency ISO-код, наприклад EUR.
 * @property {string} edition
 * @property {string} region
 * @property {string} url
 */
export {};
