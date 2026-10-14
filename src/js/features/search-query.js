const KNOWN_ALIASES = Object.freeze({
  gta5: 'Grand Theft Auto V', gtav: 'Grand Theft Auto V', гта5: 'Grand Theft Auto V',
  gta4: 'Grand Theft Auto IV', gtaiv: 'Grand Theft Auto IV',
  rdr2: 'Red Dead Redemption 2', рдр2: 'Red Dead Redemption 2',
  bg3: "Baldur's Gate 3", бг3: "Baldur's Gate 3",
  tw3: 'The Witcher 3: Wild Hunt', witcher3: 'The Witcher 3: Wild Hunt',
  csgo: 'Counter-Strike: Global Offensive', cs2: 'Counter-Strike 2',
});
const ROMAN = Object.freeze({ i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8', ix: '9', x: '10',
  xi: '11', xii: '12', xiii: '13', xiv: '14', xv: '15', xvi: '16', xvii: '17', xviii: '18', xix: '19', xx: '20' });
const CYRILLIC = 'йцукенгшщзхїфівапролджєячсмитьбю';
const LATIN = "qwertyuiop[]asdfghjkl;'zxcvbnm,.";
const EXTRA_LAYOUT = Object.freeze({ ё: '`', ъ: ']', ы: 's', э: "'", ґ: '\\' });

export function cleanSearchQuery(value) {
  return String(value ?? '').normalize('NFKC').replace(/[\p{Cc}\p{Cf}]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
}
export function searchKey(value) {
  return cleanSearchQuery(value).normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[’'`]/g, '').replace(/&/g, ' and ').replace(/([\p{L}])(\d)/gu, '$1 $2').replace(/(\d)([\p{L}])/gu, '$1 $2')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/).map(word => ROMAN[word] ?? word).join(' ');
}
export function compactSearchKey(value) { return searchKey(value).replace(/\s/g, ''); }
export function keyboardSearchQuery(value) {
  const query = cleanSearchQuery(value);
  if (!/[а-яіїєґ]/i.test(query) || /[a-z]/i.test(query)) return query;
  return [...query.toLowerCase()].map(char => {
    if (Object.hasOwn(EXTRA_LAYOUT, char)) return EXTRA_LAYOUT[char];
    const index = CYRILLIC.indexOf(char);
    return index < 0 ? char : LATIN[index];
  }).join('');
}
export function normalizeSearchQuery(value) {
  const query = cleanSearchQuery(value);
  const aliasKey = query.toLowerCase().replace(/[\s.\-_]/g, '');
  if (Object.hasOwn(KNOWN_ALIASES, aliasKey)) return KNOWN_ALIASES[aliasKey];
  const words = query.split(' ');
  for (const length of [2, 1]) {
    const prefix = words.slice(0, length).join('').toLowerCase();
    if (words.length > length && Object.hasOwn(KNOWN_ALIASES, prefix)) return (KNOWN_ALIASES[prefix] + ' ' + words.slice(length).join(' ')).slice(0, 200);
  }
  const layoutKey = keyboardSearchQuery(query).toLowerCase().replace(/[\s.\-_]/g, '');
  return Object.hasOwn(KNOWN_ALIASES, layoutKey) ? KNOWN_ALIASES[layoutKey] : query;
}
export function gameSearchAliases(game) {
  const name = cleanSearchQuery(game?.name ?? game?.title);
  if (!name) return [];
  const tokens = searchKey(name).split(' ');
  const acronym = tokens.map(word => /^\d+$/.test(word) ? word : word[0]).join('');
  const withoutArticles = tokens.filter(word => !['the', 'a', 'an', 'of', 'and'].includes(word));
  return [...new Set([compactSearchKey(name), compactSearchKey(game.slug || ''), acronym,
    withoutArticles.map(word => /^\d+$/.test(word) ? word : word[0]).join('')].filter(key => key.length >= 2))];
}
export function generateAliases(games) {
  const grouped = new Map();
  for (const game of Array.isArray(games) ? games : Object.values(games || {})) {
    const name = cleanSearchQuery(game?.name ?? game?.title);
    const id = String(game?.id ?? name);
    for (const key of gameSearchAliases(game)) {
      if (!grouped.has(key)) grouped.set(key, new Map());
      grouped.get(key).set(id, name);
    }
  }
  return Object.fromEntries([...grouped].filter(([, matches]) => matches.size === 1).map(([key, matches]) => [key, [...matches.values()][0]]));
}
