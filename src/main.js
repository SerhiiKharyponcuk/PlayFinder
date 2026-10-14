import './scss/main.scss';
import { initNavigation } from './js/components/navigation.js';
import { initSearch } from './js/features/search.js';
import { initForms } from './js/components/forms.js';
import { initPageAnimations } from './js/animations/page-animations.js';
import { siteLoading } from './js/components/site-loader.js';
import { initI18n } from './js/i18n/dom.js';

const pages = {
  home: () => import('./js/pages/home.js'),
  games: () => import('./js/pages/games.js'),
  about: () => import('./js/pages/about.js'),
  game: () => import('./js/pages/game.js'),
  favorites: () => import('./js/pages/favorites.js'),
  login: () => import('./js/pages/login.js'),
};

// Спочатку мова, потім запускаємо кнопки та завантаження сторінки.
initI18n();
initNavigation();
initSearch();
initForms();
const loadPage = pages[document.body.dataset.page];
if (loadPage) {
  const boot = siteLoading.begin('Готуємо сторінку…');
  loadPage().then(async ({ init }) => {
    const initialized = init();
    boot.finish();

    initPageAnimations();
    await initialized;
  }).catch(error => {
    boot.finish();
    console.error('Не вдалося ініціалізувати сторінку', error);
  });
}
