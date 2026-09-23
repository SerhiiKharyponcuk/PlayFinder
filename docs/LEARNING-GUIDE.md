# Карта роботи на уроці

## Починай тут

1. Ключі й Firebase Console → [API-SETUP.md](API-SETUP.md).
2. Логіка головної → `src/js/pages/home.js`, усередині `async init()`.
3. Шаблон картки → `src/templates/game-card.hbs`.
4. Запит RAWG → `src/js/api/providers/rawg.js`.

## Як дані стають карткою

`home.js init()` → `gamesService.getGames()` → `rawg.js` → `http.js fetch`
→ `data.results` → `normalizeGame()` → `{ games, total, hasNext }`
→ `renderGames()` → Handlebars → `#popularGames`.

У `main.js` не треба писати запит конкретної сторінки. Він лише запускає потрібний `init()`.
`loadSection()` показує loading, викликає передану функцію отримання даних, потім render.
Якщо запит упав, показує повідомлення; у finally прибирає loading.

## Де писати

| Завдання | Файл |
| --- | --- |
| Додати поле RAWG до нашої гри | `api/providers/rawg.js` → `normalizeGame` |
| Додати поле в HTML картки | `src/templates/game-card.hbs` → `{{назваПоля}}` |
| Змінити кількість популярних | `pages/home.js` → `pageSize` |
| Пошук і фільтри каталогу | `pages/games.js` → передати параметри у сервіс |
| Параметри конкретного API | `api/providers/rawg.js` |
| Пропозиції магазинів | `api/providers/cheapshark.js` |
| Порівняння пропозицій | `services/prices-service.js` |
| Вхід / реєстрація | `pages/login.js` + `services/auth-service.js` |
| Зберігати/читати обране | `services/favorites-service.js` |
| Реакція на сердечко | `features/favorites.js` |
| Список обраного | `pages/favorites.js` |
| Стилі картки | `src/scss/components/_game-card.scss` |

Шляхи JS у таблиці відносні до `src/js/`.
Початковий `api/providers/catalog.js` тепер лише переекспортує RAWG для сумісності.
Старі порожні `prices-primary/secondary.js` замінені на один `cheapshark.js`.

## Контракти, які важливо не плутати

- `getGames()` → **об'єкт** `{ games, total, hasNext }`; саме games є масивом.
- `getGame(id)` → **одна** гра.
- `getDeals()` → масив пропозицій CheapShark для правої колонки.
- `getOffers(game)` → `{ offers, errors, configured }` після підтвердження CheapShark ID.
- `favoritesService.listIds()` → масив рядків із RAWG ID.

RAWG: `name` → `title`, `background_image` → `image`, вкладені platforms → масив назв.
Handlebars: `{{title}}` вставляє екранований текст; `{{#each platforms}}` перебирає масив.
`cards.js` викликає шаблон для кожної гри і склеює HTML через `join('')`.
Для #bestDeals використовується `deal.hbs`, не велика картка гри.

## Чому карток не було раніше і що виправлено

На уроці код поза init() вставляв картку, а наступний виклик showSetupState її стирав.
У HTML не було {{title}} / {{image}}, а API в main.js лише писав відповідь у console.
Тепер запити та рендер всередині init(), шаблон спільний і має потрібні підстановки,
а RAWG-відповідь перетворюється у визначений формат. Описку patforms також прибрано.

Якщо карток ще немає: подивись повідомлення секції. Без VITE_RAWG_API_KEY немає запиту RAWG.
При 401/403 перевір ключ; при помилці мережі — Network. Для Firebase перевір конфіг,
Email/Password та опубліковані Rules. CheapShark може працювати незалежно від решти сервісів.

## Що ще лишилося навчальним завданням

Повна пагінація, складні фільтри, історія цін, сповіщення та UI вибору відповідної гри
CheapShark на prices.html. Заготовка сторінки порівняння не стала готовою від самого API-адаптера.
Автоматичні тести перевіряють код із підставними даними; власний Firebase треба перевірити
двома різними користувачами після налаштування.
