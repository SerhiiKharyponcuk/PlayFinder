import template from '../../templates/game-detail.hbs?template';
import { safeImage, safeLink } from '../utils/urls.js';
import { formatPrice } from '../utils/format.js';
import { platformIcons } from '../utils/platforms.js';
import { releaseInfo } from '../utils/release.js';
import { matchedProduct } from '../services/game-matching.js';

/** Тільки відображення. Game приходить з RAWG, Offer[] — з сервісу цін.
 * Шаблон {{...}} екранує текст: навіть опис API не є довільним HTML.
 * Не вигадуємо рейтинг, дату або назви компаній для незаповнених полів.
 */
export function renderGameDetails(container, game, { offers = [], errors = [] } = {}, { pricesOnly = false } = {}) {
  const release = releaseInfo(game);
  // Таблиця може оновитися на межі TTL після завантаження summary-картки.
  // У такому разі мінімум і кількість магазинів беремо з цієї самої таблиці.
  const price = offers.length ? offers[0].price : game.price;
  const storeCount = offers.length ? new Set(offers.map(offer => offer.storeId || offer.store)).size : game.storeCount;
  const hasPrice = Number.isFinite(price) && price >= 0;
  const plural = new Intl.PluralRules('uk').select(storeCount);
  const description = game.description?.trim() || 'Опис цієї гри у RAWG ще не додано.';
  const longDescription = description.length > 650;
  const cut = description.lastIndexOf(' ', 450);
  const html = template({
    ...game, ...(offers[0]?.productTitle ? matchedProduct(offers[0].productTitle) : {}),
    release, hasPrice, storeCount, priceLoading: game.priceStatus === 'loading', priceStale: offers.length ? offers.some(offer => offer.priceStale) : game.priceStale,
    image: safeImage(game.image), website: safeLink(game.website),
    platformIcons: platformIcons(game.platforms),
    description: longDescription ? description.slice(0, cut > 300 ? cut : 450) + '…' : description,
    fullDescription: longDescription ? description : '',
    genreLabel: game.genres?.join(', '), developerLabel: game.developers?.join(', '), publisherLabel: game.publishers?.join(', '),
    hasRating: !release.isUpcoming && Number.isFinite(game.rating) && game.rating > 0 && game.ratingsCount > 0,
    ratingLabel: Number.isFinite(game.rating) ? game.rating.toFixed(1) : '',
    formattedPrice: hasPrice ? formatPrice(price, 'USD') : '',
    storesLabel: plural === 'one' ? 'магазин' : plural === 'few' ? 'магазини' : 'магазинів',
    priceMessage: errors.length ? 'Не вдалося завантажити пропозиції. Спробуй пізніше.'
      : (game.priceStatus === 'error' || game.priceStatus === 'limited') ? game.priceError
      : release.isUpcoming ? 'Пропозицій до релізу поки немає.' : 'Зараз немає доступних пропозицій.',
    offers: offers.map((offer, index) => ({ ...offer, best: index === 0, url: safeLink(offer.url), formattedPrice: formatPrice(offer.price, offer.currency) })),
  });
  const currentPrices = container.querySelector('.game-detail__prices');
  if (pricesOnly && currentPrices) {
    const next = document.createElement('template'); next.innerHTML = html;
    currentPrices.replaceWith(next.content.querySelector('.game-detail__prices'));
  } else container.innerHTML = html;
}
