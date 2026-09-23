import Handlebars from 'handlebars';
import cardSource from '../../templates/game-card.hbs?raw';
import dealSource from '../../templates/deal.hbs?raw';
import { safeImage } from '../utils/urls.js';
import { formatPrice } from '../utils/format.js';

// ЄДИНЕ місце компіляції шаблонів. Дані вставляються тільки через {{...}} з escaping.
const card = Handlebars.compile(cardSource);
const deal = Handlebars.compile(dealSource);
export function renderGames(container, games) {
  container.innerHTML = games.map(game => card({ ...game, image: safeImage(game.image),
    detailsUrl: './game.html?id=' + encodeURIComponent(game.id),
  })).join('');
}
export function renderDeals(container, deals) {
  container.innerHTML = deals.map(item => deal({ ...item, formattedPrice: formatPrice(item.price, item.currency) })).join('');
}
