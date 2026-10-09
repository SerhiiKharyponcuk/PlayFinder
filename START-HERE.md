# PlayFinder: де що лежить

Головна й каталог показують ігри з мінімальними цінами. На сторінці деталей є інформація про гру та пропозиції магазинів. Фільтри каталогу, вхід і обране підключені.

**Для найближчого уроку відкрий [план покращення пошуку](docs/SEARCH-LESSON.md).** За годину дописуємо обробку пробілів і скорочень. Підключення функції та перевірка прикладів підготовлені; самі покращення ще потрібно написати.

## Карта проєкту

| Що змінюємо | Файл |
| --- | --- |
| Обробка пошукового запиту: файл уроку | [search-query.js](src/js/features/search-query.js), `normalizeSearchQuery` |
| Підключення комп'ютерної й мобільної форм | [search.js](src/js/features/search.js), `initSearch` |
| Локальний об'єкт із 10 000 ігор для пошуку | [search-games.js](src/js/data/search-games.js), [як використати](docs/SEARCH-DATA.md) |
| Стан фільтрів каталогу, URL, відбір за ціною | [catalog-state.js](src/js/features/catalog-state.js) |
| Списки, чекбокси, категорії, мобільна панель, пагінація | [filters.js](src/js/features/filters.js) |
| Завантаження каталогу | [games.js](src/js/pages/games.js) |
| Секції головної | [home.js](src/js/pages/home.js) |
| Деталі гри та її пропозиції | [game.js](src/js/pages/game.js), [game-details.js](src/js/components/game-details.js), [game-detail.hbs](src/templates/game-detail.hbs) |
| Довідники ID та перетин дат | [rawg-filters.js](src/js/api/rawg-filters.js) |
| Параметри RAWG, нормалізація гри | [rawg.js](src/js/api/providers/rawg.js) |
| Картки та їхні ціни | [cards.js](src/js/components/cards.js), [game-card.hbs](src/templates/game-card.hbs) |
| Пропозиції магазинів у деталях гри | [prices-service.js](src/js/services/prices-service.js) |
| Зіставлення назви та видання | [game-matching.js](src/js/services/game-matching.js) |
| Мінімальна ціна картки, пакет цін | [card-prices.js](src/js/services/card-prices.js) |
| Перевірені пари RAWG ID → CheapShark gameID | [game-links.js](src/js/services/game-links.js) |
| CheapShark, кеш, черга та пауза 429 | [cheapshark.js](src/js/api/providers/cheapshark.js), [cheapshark-client.js](src/js/api/cheapshark-client.js) |
| Вигляд каталогу та деталей гри | [_games.scss](src/scss/pages/_games.scss), [_game.scss](src/scss/pages/_game.scss) |
| Вхід та обране | [auth-service.js](src/js/services/auth-service.js), [favorites-service.js](src/js/services/favorites-service.js) |
| Налаштування API | [config.js](src/js/config.js), [.env.example](.env.example) |
| Старт сторінок і спільні стилі | [main.js](src/main.js), [main.scss](src/scss/main.scss) |

Каталог: `games.html`. Деталі вибраної гри: `game.html?id=4200`, де 4200 — RAWG ID Portal 2. Сторінки запускаються через `src/main.js`.

Ціни CheapShark — для PC у USD. Ціновий відбір каталогу працює серед завантажених ігор поточної сторінки. Магазини каталогу перевіряють наявність гри в RAWG.

```sh
npm run dev
npm run lesson:search
npm run check:filters
npm test
npm run build
```

Пояснення винесені в документацію; коментарі в HTML/JS/SCSS прибрані.

Деталі: [план пошуку](docs/SEARCH-LESSON.md), [фільтри](docs/FILTERS-LESSON.md), [ціни карток](docs/CARD-PRICES.md), [сторінка гри](docs/GAME-DETAILS.md), [кеш цін](docs/PRICE-CACHE.md), [налаштування API](docs/API-SETUP.md).

Після commit і push GitHub Actions збирає сайт у `dist` і публікує на GitHub Pages. Не редагуйте `dist` вручну.
