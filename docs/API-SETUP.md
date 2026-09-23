# RAWG + CheapShark + Firebase: налаштування

## 1. Локальні значення

Скопіюй `.env.example` → `.env.local` біля `package.json`.
Не перезаписуй свій env-файл, якщо в ньому вже є потрібні налаштування: додай нові поля.
Після зміни перезапусти `npm run dev`.

| Поле | Де взяти |
| --- | --- |
| `VITE_RAWG_API_KEY` | https://rawg.io/apidocs → Get API Key |
| `VITE_FIREBASE_API_KEY` | Firebase Console → Project settings → Your apps → Web → `apiKey` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Той самий конфіг → `authDomain` |
| `VITE_FIREBASE_PROJECT_ID` | Той самий конфіг → `projectId` |
| `VITE_FIREBASE_APP_ID` | Той самий конфіг → `appId` |

URL RAWG заданий у `config.js`, ключ передається окремо.
Стара змінна `VITE_CATALOG_API_URL`, яку на уроці передавали як key, більше не використовується.
CheapShark не потребує ключа. Firebase не замінює RAWG або CheapShark.

## 2. Firebase Console

1. Створи/обери власний проєкт і зареєструй Web app. Перенеси 4 поля конфігу вище.
2. Authentication → Sign-in method → Email/Password → Enable.
3. Authentication → Settings → Authorized domains: додай `localhost` та
   `serhiikharyponcuk.github.io` (домен, без `/PlayFinder/`).
4. Створи Cloud Firestore у вибраному регіоні.
5. Firestore → Rules: встав вміст кореневого `firestore.rules` та натисни Publish.
   Або зі встановленим Firebase CLI виконай
   `firebase deploy --only firestore:rules --project YOUR_PROJECT_ID`.
6. Відкрий `login.html`, зареєструй тестовий акаунт, додай гру сердечком,
   перевір `favorites.html`. Вийди — обране іншого користувача має бути недоступним.

Правила дозволяють доступ тільки власнику до `users/{uid}/favorites/{rawgId}`.
Не вмикай загальний публічний write/test mode. Наші правила не опубліковані автоматично;
перед запуском перевір їх у Firebase Rules Playground для власника, іншого UID і без входу.
Жодні віддалені Firebase-проєкти цими змінами не створено.

У Firestore зберігається лише ID гри і дата збереження. Паролі обробляє Firebase Auth.
На сторінці обраного назви й обкладинки знову читаються з RAWG, тому там також потрібен ключ RAWG.
Firebase web apiKey — ідентифікатор клієнтського проєкту; захист даних забезпечують Auth і Rules.
Не вставляй service account JSON або приватні ключі у frontend.

## 3. GitHub Pages

Локальний `.env.local` не потрапляє на GitHub.
У Settings → Secrets and variables → Actions створи:

**Secrets:** `VITE_RAWG_API_KEY`, `VITE_FIREBASE_API_KEY`.

**Variables:** `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`.

Імена повинні збігатися з `.github/workflows/deploy.yml`. Після зміни значень запусти
Deploy PlayFinder to GitHub Pages → Run workflow або зроби push.
Vite підставляє їх при збірці: зберігання у GitHub Secrets не робить ключ невидимим у JS браузера.
Якщо потрібен справді секретний ключ, використовуй власний backend proxy.

## 4. Де що брати у коді

```js
import { gamesService } from '../services/games-service.js';
const { games, total, hasNext } = await gamesService.getGames({ query: 'Portal' });
// games — Game[], вже з title/image/platforms. Не використовуй .results у сторінці!
```

```js
import { cheapsharkProvider } from '../api/providers/cheapshark.js';
const deals = await cheapsharkProvider.getDeals({ limit: 5 });
// Можна показувати незалежно від RAWG. Ціна числова, currency завжди USD.
const candidates = await cheapsharkProvider.searchGames('Portal');
// Потрібно перевірити кандидата та його видання, а не обрати candidates[0] автоматично.
```

```js
import { getOffers } from '../services/prices-service.js';
// game — об'єкт RAWG. cheapshark ID береться з перевіреного кандидата (поле gameID).
const linkedGame = { ...game, providerIds: { ...game.providerIds, cheapshark: selectedCandidate.gameID } };
const { offers, errors } = await getOffers(linkedGame, { currency: 'USD' });
// Ця прив'язка поки в пам'яті; її довготривале збереження — наступне завдання.
```

CheapShark не підтверджує регіон/видання у нашому адаптері: вони позначені `unknown`.
Фільтр `edition: 'standard'` свідомо відсіє такі непідтверджені пропозиції.
RAWG покриває також консолі; наявність гри у RAWG не гарантує пропозицію CheapShark.

## Офіційні джерела

- RAWG: https://rawg.io/apidocs (ключ у кожному запиті; на сторінках додано посилання-атрибуцію).
- CheapShark: https://apidocs.cheapshark.com/
- Firebase SDK: https://firebase.google.com/docs/web/setup
- Firebase keys: https://firebase.google.com/docs/projects/api-keys
- Firestore rules: https://firebase.google.com/docs/firestore/security/rules-conditions
