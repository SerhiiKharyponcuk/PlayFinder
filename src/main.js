import './scss/main.scss';
import { initNavigation } from './js/components/navigation.js';
import { initSearch } from './js/features/search.js';
import { initForms } from './js/components/forms.js';
import { initPageAnimations } from './js/animations/page-animations.js';

const pages = {
  home: () => import('./js/pages/home.js'),
  games: () => import('./js/pages/games.js'),
  prices: () => import('./js/pages/prices.js'),
  about: () => import('./js/pages/about.js'),
  game: () => import('./js/pages/game.js'),
  favorites: () => import('./js/pages/favorites.js'),
  login: () => import('./js/pages/login.js'),
  privacy: () => import('./js/pages/privacy.js'),
  terms: () => import('./js/pages/terms.js'),
};

initNavigation();
initSearch();
initForms();
const loadPage = pages[document.body.dataset.page];
if (loadPage) {
  loadPage().then(async ({ init }) => {
    await init();
    initPageAnimations();
  }).catch(error => {
    console.error('Не вдалося ініціалізувати сторінку', error);
  });
}
