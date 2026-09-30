/** НОРМАЛІЗАТОР НАЗВ — почніть тут, якщо RAWG і CheapShark називають гру по-різному.
 * titleKey() прибирає лише відмінності написання. Номер, підзаголовок і видання
 * залишаються частиною ключа: Portal 2 / Portal, Deluxe / базова гра — різні товари.
 * matchGame() порівнює повні ключі, а не includes / відсоток схожості.
 * Цей файл не виконує HTTP-запитів і не обирає найдешевший випадковий результат.
 */

const ROMAN = new Map([
  ['i', '1'], ['ii', '2'], ['iii', '3'], ['iv', '4'], ['v', '5'],
  ['vi', '6'], ['vii', '7'], ['viii', '8'], ['ix', '9'], ['x', '10'],
  ['xi', '11'], ['xii', '12'], ['xiii', '13'], ['xiv', '14'], ['xv', '15'],
  ['xvi', '16'], ['xvii', '17'], ['xviii', '18'], ['xix', '19'], ['xx', '20'],
]);
const TO_ROMAN = new Map([...ROMAN].map(([roman, number]) => [number, roman]));
// Окрема X може бути літерою: Mega Man X — НЕ Mega Man 10.
// Для однолітерних I/V/X потрібна відома серія з римськими номерами.
const ROMAN_SERIES = /^(?:grand theft auto|civilization|final fantasy|mafia|the elder scrolls|street fighter|resident evil|god of war)$/;

// Тільки відомі скорочення, а не довільне вгадування за першими літерами.
// Вирази прив'язані до ПОЧАТКУ назви і зберігають увесь залишок (DLC, видання…).
const ALIASES = [
  [/^(?:gta|гта)\s*(?=\d|[ivx]+(?:\s|$))/, 'grand theft auto '],
  [/^(?:gta|гта)(?=\s|$)/, 'grand theft auto'],
  [/^rdr\s*(?=\d|[ivx]+(?:\s|$))/, 'red dead redemption '],
  [/^cs\s*2(?=\s|$)/, 'counter strike 2'],
  [/^cs\s*go(?=\s|$)/, 'counter strike global offensive'],
  [/^bg\s*3(?=\s|$)/, 'baldurs gate 3'],
  [/^civ\s*(?=\d|[ivx]+(?:\s|$))/, 'civilization '],
  [/^sid meiers (?=civilization\s)/, ''],
  [/^tom clancys (?=(?:rainbow six|ghost recon|splinter cell)(?:\s|$))/, ''],
  [/^the (?=witcher(?:\s|$))/, ''],
];

function spelling(title) {
  if (typeof title !== 'string') return '';
  return title
    // Спершу ™: NFKD інакше перетворить цей символ на букви TM.
    .replace(/[™®℠]/g, '').normalize('NFKD').replace(/\p{M}/gu, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '').toLowerCase()
    // S.T.A.L.K.E.R. / STALKER, L.A. / LA. Цифри 2.0 не склеюємо в 20.
    .replace(/\b(?:[a-z]\.){2,}/g, word => word.replaceAll('.', ''))
    .replace(/[’‘'`ʼ]/g, '').replace(/&/g, ' and ').replace(/\+/g, ' plus ')
    // Лише явна PC-позначка у дужках. Рік, PS5, регіон тощо не видаляємо.
    .replace(/\s*[(\[]\s*(?:pc|windows|steam)\s*[)\]]\s*$/, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}
function expandAliases(key) {
  return ALIASES.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), key)
    .trim().replace(/\s+/g, ' ');
}

export function titleKey(title) {
  let key = expandAliases(spelling(title));
  // Прибираємо різницю 5 / V, 3 / III, але НЕ сам номер.
  // I на початку I Am Alive — слово, не номер. Однослівна X також лишається X.
  const words = key.split(' ');
  key = words.map((word, index) => {
    const number = ROMAN.get(word);
    if (!number || index === 0) return word;
    return word.length > 1 || ROMAN_SERIES.test(words.slice(0, index).join(' ')) ? number : word;
  }).join(' ');
  return key
    // Ці слова означають саме базове видання, а не додатковий вміст.
    .replace(/\s+(?:standard|base) edition$/, '')
    // GOTY / Game of the Year — два написання одного видання, не базова гра.
    .replace(/\s+(?:the )?(?:game of the year|goty)(?: edition)?$/, ' goty edition')
    .replace(/\s+(deluxe|ultimate|complete|premium|premium online|gold|special|definitive|collector s|collectors)(?: edition)?$/, ' $1 edition')
    .replace(/\s+directors cut(?: edition)?$/, ' directors cut')
    .replace(/\s+(enhanced|legacy|remastered)(?: edition)?$/, ' $1');
}

/** GTA V зараз продається під новою PC-назвою. Це виняток для КОНКРЕТНОЇ гри,
 * не дозвіл прибирати Enhanced/Remastered з будь-якої назви.
 * Rockstar підтверджує, що покупка містить повну GTA V Enhanced і Legacy:
 * https://store.rockstargames.com/en/game/buy-gta-v (перевірено 01.10.2026).
 * Не включаємо Premium, Shark Cards, Starter Pack або GTA Online окремо.
 * Якщо користувач обрав саме Legacy / Premium, виняток до нього не застосовується.
 */
const CURRENT_PC_TITLES = new Map([
  ['grand theft auto 5', ['grand theft auto 5 enhanced', 'grand theft auto 5 legacy']],
]);

function uniqueMatch(game, candidates) {
  const byId = new Map(candidates.map(item => [String(item.gameID), item]));
  if (byId.size === 1) return { status: 'matched', match: [...byId.values()][0] };
  // Steam ID може розрізнити дублікати, якщо він уже відомий у нашій грі.
  // Однаковий Steam ID не дає права пропустити перевірку назви/видання вище.
  const steamId = game.providerIds?.steam;
  if (steamId && byId.size > 1) {
    const sameSteam = [...byId.values()].filter(item => String(item.steamAppID) === String(steamId));
    if (sameSteam.length === 1) return { status: 'matched', match: sameSteam[0] };
  }
  return { status: byId.size ? 'ambiguous' : 'unmatched', match: null };
}

export function findGameMatch(game, candidates) {
  const key = titleKey(game?.title);
  if (!key || !Array.isArray(candidates)) return { status: 'unmatched', match: null };
  const valid = candidates.filter(item => /^\d+$/.test(String(item?.gameID || ''))
    && typeof item.external === 'string' && titleKey(item.external));
  // Спочатку базовий/точно обраний товар. Перевірене нове PC-ім'я — тільки резерв.
  // За неоднозначності НЕ беремо дешевший ID і НЕ переходимо до іншого видання.
  for (const allowed of [key, ...(CURRENT_PC_TITLES.get(key) || [])]) {
    const result = uniqueMatch(game, valid.filter(item => titleKey(item.external) === allowed));
    if (result.status !== 'unmatched') return result;
  }
  return { status: 'unmatched', match: null };
}
export const matchGame = (game, candidates) => findGameMatch(game, candidates).match;

/** Назва для ПОШУКУ і ключ для ПОРІВНЯННЯ — різні речі.
 * CheapShark часто шукає текстом: GTA 5 треба розгорнути до Grand Theft Auto V.
 * Звичайні RAWG-назви залишаємо такими самими, щоб використати попередній кеш.
 */
export function searchTitle(title) {
  const original = typeof title === 'string'
    ? title.replace(/[™®℠]/g, '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase() : '';
  const simple = spelling(title);
  const expanded = expandAliases(simple);
  const numberedSeries = expanded.replace(/^(grand theft auto|civilization) (\d+)\b/, (all, series, number) =>
    `${series} ${TO_ROMAN.get(number) || number}`);
  return simple === numberedSeries ? original : numberedSeries;
}

/** Максимум ОДИН резервний пошук за серією, якщо повна назва не дала збігу.
 * Portal II / Portal 2 → пошук Portal, потім знову сувора перевірка повної назви.
 * Не перебираємо 5/6 варіантів у мережі. Обидва результати кешує загальний клієнт.
 */
export function fallbackSearchTitle(title) {
  const key = titleKey(title);
  const sequel = /\s\d+(?=\s|$)/.exec(key);
  if (!sequel) return '';
  const series = key.slice(0, sequel.index).trim();
  return series.length >= 3 && /\p{L}/u.test(series) && series !== searchTitle(title) ? series : '';
}

const EDITION_LABELS = [
  [/\s+enhanced(?: edition)?$/, 'Enhanced'], [/\s+legacy(?: edition)?$/, 'Legacy'],
  [/\s+goty edition$/, 'Game of the Year'], [/\s+premium online edition$/, 'Premium Online Edition'],
  [/\s+deluxe edition$/, 'Deluxe Edition'], [/\s+ultimate edition$/, 'Ultimate Edition'],
  [/\s+complete edition$/, 'Complete Edition'], [/\s+premium edition$/, 'Premium Edition'],
  [/\s+gold edition$/, 'Gold Edition'], [/\s+special edition$/, 'Special Edition'],
  [/\s+definitive edition$/, 'Definitive Edition'], [/\s+remastered(?: edition)?$/, 'Remastered'],
  [/\s+directors cut$/, "Director’s Cut"],
];
export function matchedProduct(title) {
  const key = titleKey(title);
  return {
    priceProductTitle: title,
    priceEditionLabel: EDITION_LABELS.find(([pattern]) => pattern.test(key))?.[1] || '',
  };
}
