/**
 * СТАРТ ПРОЄКТУ. Кожна HTML-сторінка підключає саме цей файл.
 * Тут запускаємо спільні можливості та обираємо модуль сторінки за body[data-page].
 * Наприклад, index.html має data-page="home" → виконується pages/home.js.
 * Код отримання й виведення карток головної сторінки пиши в pages/home.js → init(),
 * а не тут: main.js виконується також на «Про нас», «Вхід» та інших сторінках.
 * Карта файлів і пояснення помилок: docs/LEARNING-GUIDE.md.
 */

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

