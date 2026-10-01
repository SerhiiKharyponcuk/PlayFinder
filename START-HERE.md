# PlayFinder: де що лежить і куди писати

**Відкрий цей файл на початку уроку.** Посилання ведуть прямо до коду.
Спочатку обери завдання в таблиці. Не потрібно читати всі папки одразу.

## Хочу змінити…

| Завдання | Почни тут | Що саме писати |
| --- | --- | --- |
| Вміст головної: популярні ігри, релізи | [home.js](src/js/pages/home.js) | Які списки завантажувати та в які блоки їх виводити |
| Каталог ігор | [games.js](src/js/pages/games.js) | Завантаження каталогу, обробники його елементів |
| Що показується після натискання на гру | [game.js](src/js/pages/game.js) | Вміст сторінки конкретної гри |
| Розмітка та стилі відкритої картки | [game-detail.hbs](src/templates/game-detail.hbs), [_game.scss](src/scss/pages/_game.scss) | Обкладинка, опис, таблиця пропозицій, адаптивний вигляд |
| Позначка «Ще не вийшла» і дата виходу | [release.js](src/js/utils/release.js) | RAWG `released` / `tba` приходять із [rawg.js](src/js/api/providers/rawg.js); статус обчислюється при показі |
| Знайти відповідність гри між RAWG і CheapShark | [game-matching.js](src/js/services/game-matching.js) | `titleKey()` — нормалізатор; `matchGame()` — перевірка повної назви й видання; `ALIASES` — відомі скорочення |
| Змінити, як обирається найнижча ціна | [card-prices.js](src/js/services/card-prices.js) | Відбір пропозицій і `Math.min(...)` |
| Змінити поля чи параметри запиту RAWG | [rawg.js](src/js/api/providers/rawg.js) | `normalizeGame()` — поля гри; `getGames()` — параметри запиту |
| Змінити запит CheapShark | [cheapshark.js](src/js/api/providers/cheapshark.js) | `searchGames()` — пошук; `getOffers()` — пропозиції гри |
| Кеш, частота запитів і пауза після 429 | [cheapshark-client.js](src/js/api/cheapshark-client.js) | Строки кешу, спільна черга, діагностика; збереження — [response-cache.js](src/js/api/response-cache.js) |
| Записати перевірену пару ID | [game-links.js](src/js/services/game-links.js) | RAWG ID → ID конкретного товару CheapShark |
| Дозволити нову PC-назву конкретної гри, як GTA V → Enhanced | [game-matching.js](src/js/services/game-matching.js) | `CURRENT_PC_TITLES` — тільки підтверджені повні товари; посилання на джерело залиште в коментарі |
| Додати рейтинг або інше поле на картку | [game-card.hbs](src/templates/game-card.hbs) | HTML картки; поле також має прийти з `rawg.js` |
| Підготувати дані до показу в картці | [cards.js](src/js/components/cards.js) | Формат ціни, підписи, дані для шаблону |
| Лоадери, ранній показ карток і кнопка оновлення цін | [game-list.js](src/js/components/game-list.js), [_loading.scss](src/scss/components/_loading.scss) | Пояснення — [LOADING.md](docs/LOADING.md) |
| Спільний індикатор завантаження в кутку екрана | [site-loader.js](src/js/components/site-loader.js) | `begin()` → `update()` → `finish()`; завершуйте завдання у `finally` |
| Як Vite компілює шаблони карток | [handlebars-plugin.js](scripts/handlebars-plugin.js), [vite.config.js](vite.config.js) | `.hbs?template` готується до відправлення в браузер; HTML редагуйте в `src/templates` |
| Полегшені фони | [public/images](public/images) | Сторінки використовують `.webp` та мобільний `-640.webp`; PNG лишені як оригінали |
| Змінити іконки платформ | [platforms.js](src/js/utils/platforms.js) | Відповідність назв платформ іконкам |
| Змінити кольори, розміри, відступи картки | [_game-card.scss](src/scss/components/_game-card.scss) | Стилі `.game-card` та її елементів |
| Змінити кількість колонок карток | [_games-grid.scss](src/scss/components/_games-grid.scss) | Сітка карток; для каталогу дивись також [_games.scss](src/scss/pages/_games.scss) |
| Виправити вигляд на телефоні/планшеті | [_responsive.scss](src/scss/layout/_responsive.scss) | Правила всередині потрібного `@media` |
| Пошук із поля у шапці | [search.js](src/js/features/search.js) | Обробка форми та перехід до результатів |
| Фільтри й сортування | [filters.js](src/js/features/filters.js), [games.js](src/js/pages/games.js) | Читання параметрів, обробники, повторне завантаження; підтримувані параметри API — у `rawg.js` |
| Таблиця порівняння цін | [prices.js](src/js/pages/prices.js) | Завантажити та відобразити пропозиції; зараз тут заглушка |
| Сортування/відбір пропозицій для таблиці | [prices-service.js](src/js/services/prices-service.js) | Робота з отриманими пропозиціями |
| Форма входу й реєстрації | [login.js](src/js/pages/login.js) | Кнопки, поля й повідомлення; виклики Firebase — в [auth-service.js](src/js/services/auth-service.js) |
| Натискання на сердечко | [features/favorites.js](src/js/features/favorites.js) | Додати/прибрати обране після натискання |
| Запис обраного в Firebase | [favorites-service.js](src/js/services/favorites-service.js) | Читання та запис ID гри у Firestore |
| Сторінка «Обране» | [pages/favorites.js](src/js/pages/favorites.js) | Завантаження і показ збережених ігор |
| Анімації | [page-animations.js](src/js/animations/page-animations.js) | Поява елементів; меню — [menu-animation.js](src/js/animations/menu-animation.js) |

## Найближчий урок: ціни — відкрийте ці файли по черзі

1. [games-service.js](src/js/services/games-service.js) — отримує гру RAWG і передає її на доповнення ціною.
2. [card-prices.js](src/js/services/card-prices.js) — шукає відповідність, записує CheapShark ID і обирає мінімум. Сам нормалізатор і перевірка видань — [game-matching.js](src/js/services/game-matching.js).
3. [cheapshark.js](src/js/api/providers/cheapshark.js) — готує запити та об'єднує пропозиції до 25 ігор в один пакет. У мережу вони йдуть через [cheapshark-client.js](src/js/api/cheapshark-client.js).
4. [cards.js](src/js/components/cards.js) — готує підписи та формат суми.
5. [game-card.hbs](src/templates/game-card.hbs) — показує готову картку.

**Де допрацьовувати DLC та видання:** починайте з `findGameMatch()` у `game-matching.js`.
Перевіряється повна нормалізована назва з номером, підзаголовком і виданням. GTA V має перевірене правило нової PC-назви Enhanced; біля ціни виводиться це видання.
Не використовуйте `includes` або перший результат пошуку: так можна взяти ціну доповнення.
Не прибирайте з назв слова Deluxe/Ultimate чи цифри — вони можуть позначати інший товар.
Навчальна `stripEdition()` збережена для розбору, але для автоматичного вибору ціни не використовується.

Як перевірити кількість запитів і кеш: [PRICE-CACHE.md](docs/PRICE-CACHE.md).

`providerIds.rawg` і `providerIds.cheapshark` — номери гри в різних базах, не API-ключі.
Ціна обирається з поточних пропозицій знайденого товару. Ціни CheapShark у картках стосуються PC.
Деталі: [як працюють ціни](docs/CARD-PRICES.md).
Релізи та оформлення відкритої картки: [GAME-DETAILS.md](docs/GAME-DETAILS.md).

## Чому є кілька папок JavaScript

| Папка | Для чого |
| --- | --- |
| `pages` | Що робити на конкретній сторінці: читати поля, завантажувати дані, показувати результат |
| `services` | Спільна логіка: поєднати дані API, обрати ціну, зберегти обране |
| `api/providers` | Запити до конкретного API та переклад його полів у наш формат |
| `components` | Спільні елементи інтерфейсу: картки, повідомлення, меню |
| `features` | Окремі дії користувача: пошук, фільтри, сердечко |
| `utils` | Невеликі допоміжні функції: формат грошей, іконки, перевірка URL |

Приклад: кнопку сортування підключаємо у `pages/games.js`, а назву параметра,
який розуміє RAWG, змінюємо у `api/providers/rawg.js`.

## Де HTML, стилі, налаштування

- HTML сторінок лежить у корені: [index.html](index.html), [games.html](games.html), [game.html](game.html), [prices.html](prices.html), [about.html](about.html), [login.html](login.html), [favorites.html](favorites.html).
- Повторюваний HTML карток — у `src/templates`. Нову картку не потрібно вручну копіювати в `index.html`.
- [src/main.js](src/main.js) запускає сторінки за `body[data-page]`. Сюди не пишемо код завантаження окремої картки.
- [main.scss](src/scss/main.scss) підключає SCSS; [_tokens.scss](src/scss/abstracts/_tokens.scss) містить спільні змінні оформлення.
- [config.js](src/js/config.js) читає налаштування. Значення для локального запуску — у `.env`/`.env.local`, приклад — [.env.example](.env.example). Не додавайте файли з власними ключами в Git.
- [client.js](src/js/api/firebase/client.js) підключає Firebase; [firestore.rules](firestore.rules) визначає доступ до обраного.
- [deploy.yml](.github/workflows/deploy.yml) збирає й публікує сайт на GitHub Pages.
- `dist` — результат збірки: вручну не редагуємо. `node_modules` — бібліотеки: власний код туди не пишемо.

## Якщо щось не працює

| Симптом | Де дивитися |
| --- | --- |
| Немає всіх карток | Консоль браузера → `pages/home.js` або `pages/games.js` → `games-service.js` → RAWG |
| Картка є, ціни немає | `game-matching.js`: чи є однозначний збіг; `card-prices.js`: його `gameID`, чи повернулися пропозиції; причина є в підказці рядка ціни |
| Є ціна іншого видання | `findGameMatch()` у `game-matching.js` та джерело вже записаного `providerIds.cheapshark` |
| Дані є в консолі, але не на картці | Чи передає `cards.js` поле з тією самою назвою, що у `game-card.hbs` |
| Стилі не такі на телефоні | `_responsive.scss`: правило може перевизначати `_game-card.scss` |
| Локально зміни є, на GitHub немає | Чи зроблено commit/push і чи успішна остання збірка в GitHub Actions |

## Команди для уроку

```sh
npm run dev    # запустити локальний сайт; адресу покаже термінал
npm test       # перевірити тести логіки
npm run build  # перевірити збірку перед публікацією
```

Для швидкого відкриття файлу у VS Code: **Ctrl + P**, введіть його назву.
Наприклад, `card-prices.js`. Пошук тексту в усьому проєкті — **Ctrl + Shift + F**.

Додатково: [пояснення для навчання](docs/LEARNING-GUIDE.md) · [налаштування API](docs/API-SETUP.md).
