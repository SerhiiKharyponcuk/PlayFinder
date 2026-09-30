import Handlebars from 'handlebars';
import cardSource from '../../templates/game-card.hbs?raw';
import dealSource from '../../templates/deal.hbs?raw';
import { safeImage } from '../utils/urls.js';
import { formatPrice } from '../utils/format.js';
import { platformIcons } from '../utils/platforms.js';
import { releaseInfo } from '../utils/release.js';

// ЄДИНЕ місце компіляції шаблонів. Дані вставляються тільки через {{...}} з escaping.
const card = Handlebars.compile(cardSource);
const deal = Handlebars.compile(dealSource);
export function renderGames(container, games) {
  // Тут лише відображення: не шукаємо відповідності і не обчислюємо мінімум повторно.
  // game.price приходить із card-prices.js. hasPrice перевіряє число, бо if (price)
  // помилково приховав би справжню нульову ціну. Іконки — всі платформи з RAWG,
  // але ціна CheapShark стосується PC (ця позначка є в шаблоні).
  container.innerHTML = games.map(game => card({ ...game, release: releaseInfo(game), image: safeImage(game.image),
    platformIcons: platformIcons(game.platforms),
    hasPrice: Number.isFinite(game.price) && game.price >= 0,
    formattedPrice: Number.isFinite(game.price) ? formatPrice(game.price, 'USD') : '',
    priceMessage: game.priceStatus === 'limited' ? 'Оновлення цін призупинено' :
      game.priceStatus === 'error' ? 'Ціна тимчасово недоступна' :
        releaseInfo(game).isUpcoming ? 'Пропозицій до релізу ще немає' : 'Немає пропозицій',
    priceCheckedLabel: Number.isFinite(game.priceUpdatedAt) ? 'Перевірено: ' + new Date(game.priceUpdatedAt).toLocaleString('uk-UA') : '',
    storesLabel: new Intl.PluralRules('uk').select(game.storeCount) === 'one' ? 'магазин' :
      new Intl.PluralRules('uk').select(game.storeCount) === 'few' ? 'магазини' : 'магазинів',
    detailsUrl: './game.html?id=' + encodeURIComponent(game.id),
  })).join('');
}
export function renderDeals(container, deals) {
  container.innerHTML = deals.map(item => deal({ ...item, formattedPrice: formatPrice(item.price, item.currency) })).join('');
}
