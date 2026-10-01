import card from '../../templates/game-card.hbs?template';
import deal from '../../templates/deal.hbs?template';
import { safeImage } from '../utils/urls.js';
import { formatPrice } from '../utils/format.js';
import { platformIcons } from '../utils/platforms.js';
import { releaseInfo } from '../utils/release.js';

// Шаблони вже компілює Vite: браузер не завантажує важкий компілятор.
// {{...}} зберігає Handlebars escaping, дані API не стають довільним HTML.
export function renderGames(container, games) {
  // Тут лише відображення: не шукаємо відповідності і не обчислюємо мінімум повторно.
  // game.price приходить із card-prices.js. hasPrice перевіряє число, бо if (price)
  // помилково приховав би справжню нульову ціну. Іконки — всі платформи з RAWG,
  // але ціна CheapShark стосується PC (ця позначка є в шаблоні).
  container.innerHTML = games.map(game => card(cardModel(game))).join('');
}
function cardModel(game) {
  return { ...game, release: releaseInfo(game), image: safeImage(game.image),
    platformIcons: platformIcons(game.platforms),
    priceLoading: game.priceStatus === 'loading',
    hasPrice: Number.isFinite(game.price) && game.price >= 0,
    formattedPrice: Number.isFinite(game.price) ? formatPrice(game.price, 'USD') : '',
    priceMessage: game.priceStatus === 'limited' ? 'Оновлення цін призупинено' :
      game.priceStatus === 'error' ? 'Ціна тимчасово недоступна' :
        releaseInfo(game).isUpcoming ? 'Пропозицій до релізу ще немає' : 'Немає пропозицій',
    priceCheckedLabel: Number.isFinite(game.priceUpdatedAt) ? 'Перевірено: ' + new Date(game.priceUpdatedAt).toLocaleString('uk-UA') : '',
    storesLabel: new Intl.PluralRules('uk').select(game.storeCount) === 'one' ? 'магазин' :
      new Intl.PluralRules('uk').select(game.storeCount) === 'few' ? 'магазини' : 'магазинів',
    detailsUrl: './game.html?id=' + encodeURIComponent(game.id),
  };
}
// Оновлюємо тільки блок ціни. Обкладинка не перезавантажується, сердечко
// не втрачає стан Firebase, а фокус користувача на посиланні лишається на місці.
export function updateGamePrices(container, games) {
  const cards = new Map([...container.querySelectorAll('.game-card')].map(node => [node.dataset.gameId, node]));
  for (const game of games) {
    const current = cards.get(String(game.id))?.querySelector('.game-card__pricing');
    if (!current) continue;
    const next = document.createElement('template');
    next.innerHTML = card(cardModel(game));
    current.replaceWith(next.content.querySelector('.game-card__pricing'));
  }
}
export function renderDeals(container, deals) {
  container.innerHTML = deals.map(item => deal({ ...item, formattedPrice: formatPrice(item.price, item.currency) })).join('');
}
