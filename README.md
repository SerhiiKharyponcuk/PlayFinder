# PlayFinder

Багатосторінковий сайт на Vite, HTML (БЕМ), SCSS і JavaScript ES modules.

## Запуск

```sh
npm install
npm run dev
npm run build
npm run preview
npm test
```

Vite збирає всі 9 HTML-сторінок. Працюй у вихідних файлах, не у `dist/`.

## Структура

```text
*.html                       точки входу сторінок і HTML templates
public/images/               локальні зображення (URL /images/...)
src/
  main.js                    єдиний вхід: стилі, спільний UI, потрібна сторінка
  scss/
    main.scss                порядок підключення через @use
    abstracts/_tokens.scss   кольори, радіуси, CSS custom properties
    base/_reset.scss         базові стилі
    components/              header, footer, hero, game-card, фільтри тощо
    layout/_responsive.scss  спільні адаптивні перевизначення
    pages/                   games, prices, about та їхні медіазапити
  js/
    config.js                мова, валюта, URL джерел, таймаут
    api/
      http.js                JSON fetch, HTTP-помилки, таймаут, AbortSignal
      types.js               JSDoc-контракти Game і Offer
      providers/             catalog, prices-primary, prices-secondary
    services/                спільний доступ до каталогу й пропозицій
    pages/                   окремий init() для кожної HTML-сторінки
    components/              меню, форми, стани сторінок
    features/                пошук, фільтри, обране
    utils/format.js          форматування ціни
 tests/api.test.js           перевірки API-клієнта та агрегування цін
```

## Де писати JavaScript

На кожній сторінці є `data-page="..."` на `body` та один `/src/main.js`.
`main.js` автоматично імпортує потрібний модуль із `src/js/pages/`.
Наприклад, каталог заповнюй у `pages/games.js`, порівняння — у `pages/prices.js`.
Спільний код винось у `features/` або `components/` і явно імпортуй там, де він потрібен.

HTML `template` для карток, результатів пошуку та пропозицій збережені.
Клонуй `template.content`, записуй текст через `textContent`, додавай готовий фрагмент
у відповідний контейнер. Не вставляй відповідь API як довільний HTML.
Використовуй збережені ID або `data-*` для JS, БЕМ-класи — для оформлення.

## Підключення 2–3 API

1. Скопіюй `.env.example` у `.env.local` і вкажи адреси API або свого backend proxy.
2. Реалізуй `getGames` / `getGame` в `api/providers/catalog.js`.
3. Реалізуй `getOffers` у `prices-primary.js`, за потреби — у `prices-secondary.js`.
   У готових адаптерах установи `enabled: true`.
4. Перетвори відповіді кожного сервісу у формати `Game` та `Offer` з `api/types.js`.
5. Викликай сервіси з модулів сторінок; заміни `showSetupState` своїм завантаженням
   і рендерингом. Передбач loading, empty, error та успішний стан.

```js
import { gamesService } from '../services/games-service.js';
import { getOffers } from '../services/prices-service.js';

const game = await gamesService.getGame(id);
const { offers, errors, configured } = await getOffers(game, {
  currency: 'EUR',
  region: 'eu',
  edition: 'standard',
});
// offers відсортовані за зростанням ціни; offers[0] — найдешевша відповідна пропозиція.
// errors містить недоступні джерела; configured=false означає, що адаптери вимкнені.
```

У різних сервісах різні ID: зберігай їх у `Game.providerIds`, а `Offer.gameId`
має дорівнювати канонічному `Game.id`. Не зіставляй ігри лише за назвою.
Сервіс не конвертує валют: USD не бере участі у порівнянні EUR.
Для коректного порівняння передавай потрібне видання і регіон.
Пропозиції різних джерел зберігаються окремо з полем `provider`.

`http.js` не вгадує формат конкретного API. Метод `request` адаптера вже містить
base URL; передавай endpoint і `{ query, signal, headers, method, body }`.
Для JSON POST самостійно вкажи `Content-Type` та `JSON.stringify(body)`.
Секретні API-ключі зберігай на сервері: всі `VITE_*` потрапляють у браузер.
Backend, endpoint-и та proxy поки не реалізовані; самі `.env` URL їх не створюють.

## БЕМ і SCSS

Приклад: `game-card`, `game-card__title`, `game-card--featured`.
Модифікатор ставиться разом із базовим класом. Загальні `active` / `is-open`
замінені на модифікатори конкретних блоків. Класи `fa-*` належать Font Awesome.
Вкладеним заголовкам, текстам, полям і посиланням додані БЕМ-елементи.

Порядок SCSS-модулів зберігає початковий каскад і медіазапити.
`components/_shared.scss` збирає спільні компоненти через `@forward`.
Сторінкові перевизначення залишені після спільних адаптивних правил, як в оригіналі.
Для нових компонентів можна використовувати `&__element` / `&--modifier`.

## Що вже працює, а що залишено тобі

Працюють збірка, переходи між сторінками, мобільне меню, акордеони «Про нас»,
перехід пошуку в каталог із `?q=...` та читання цього параметра.
Форми повідомляють, що сервіс сповіщень ще не підключений.

Каталог, ціни, пошукові підказки, сортування, фільтрація, пагінація, обране,
авторизація, сповіщення, історія цін і детальна модалка очікують твоєї реалізації.
Файли адаптерів — явні заготовки, а не вигадані працюючі інтеграції.
Поки API немає, замість нескінченних skeleton показується пояснення.
Початкові статичні тексти та лічильники у макеті не є живими даними API.

Раніше порожні `game`, `favorites`, `login`, `privacy`, `terms` тепер мають
базову оболонку і власний JS-модуль. Повний дизайн цих сторінок ще не реалізовано.
Фони скопійовані з папки «зображення для проекту»; для каталогу використано
той самий пейзаж, що й на головній. Обкладинок ігор у вихідній папці немає —
їх зможе постачати API. Font Awesome поки підключено з наявного CDN.
