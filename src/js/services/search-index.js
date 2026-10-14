import { cleanSearchQuery, normalizeSearchQuery, keyboardSearchQuery, searchKey, gameSearchAliases } from '../features/search-query.js';

export function withinEditDistance(left, right, maximum = 1) {
  if (Math.abs(left.length - right.length) > maximum) return false;
  let previous = Array.from({ length: right.length + 1 }, (_, i) => i), beforePrevious;
  for (let i = 1; i <= left.length; i++) {
    const current = [i];
    for (let j = 1; j <= right.length; j++) {
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && left[i - 1] === right[j - 2] && left[i - 2] === right[j - 1]) current[j] = Math.min(current[j], beforePrevious[j - 2] + 1);
    }
    beforePrevious = previous; previous = current;
  }
  return previous[right.length] <= maximum;
}

export function createSearchIndex(games) {
  const ids = new Set(), vocabulary = new Set();
  const records = (Array.isArray(games) ? games : Object.values(games || {})).flatMap(game => {
    const id = String(game?.id ?? ''), title = cleanSearchQuery(game?.name ?? game?.title);
    if (!/^[\w-]+$/.test(id) || !title || ids.has(id)) return [];
    ids.add(id);
    const key = searchKey(title), tokens = key.split(' '), aliases = gameSearchAliases(game);
    tokens.forEach(token => vocabulary.add(token));
    return [{ game: { id, title, slug: game.slug || '', image: game.image || '', platforms: game.platforms || [] }, key, tokens, aliases,
      compact: key.replace(/\s/g, ''), numbers: tokens.filter(token => /^\d+$/.test(token)) }];
  });
  const aliases = new Map();
  for (const record of records) for (const key of record.aliases) {
    if (!aliases.has(key)) aliases.set(key, []);
    aliases.get(key).push(record);
  }
  const matchCache = new Map();
  function find(query, limit = 6) {
    const normalized = normalizeSearchQuery(query);
    if (normalized.length < 2) return [];
    const cacheKey = normalized.toLowerCase() + ':' + limit;
    if (matchCache.has(cacheKey)) return matchCache.get(cacheKey);
    const variants = [...new Set([searchKey(normalized), searchKey(normalizeSearchQuery(keyboardSearchQuery(normalized)))])].filter(Boolean);
    const ranked = new Map();
    for (const needle of variants) {
      const words = needle.split(' '), compact = needle.replace(/\s/g, ''), numbers = words.filter(word => /^\d+$/.test(word));
      const allowed = record => numbers.every(number => record.numbers.includes(number));
      for (const record of records) {
        if (!allowed(record)) continue;
        let score = 0;
        if (record.compact === compact) score = 1000;
        else if (record.aliases.includes(compact)) score = 950;
        else if (record.key.startsWith(needle)) score = 900;
        else if (words.every(word => record.tokens.some(token => /^\d+$/.test(word) ? token === word : token.startsWith(word)))) score = 850;
        else if (record.key.includes(needle)) score = 600;
        else if (compact.length >= 2 && record.aliases.some(alias => alias.startsWith(compact))) score = 700;
        if (score) ranked.set(record, Math.max(ranked.get(record) || 0, score));
      }
      if (ranked.size < limit && words.some(word => word.length >= 4 && word.length <= 48 && !/^\d+$/.test(word))) {
        const near = new Map(words.map(word => [word, new Set([...vocabulary].filter(token => token === word ||
          (!/^\d+$/.test(word) && word.length >= 4 && word.length <= 48 && withinEditDistance(word, token, word.length >= 8 ? 2 : 1))))]));
        for (const record of records) {
          let cursor = -1;
          const orderedMatch = words.every(word => {
            const next = record.tokens.findIndex((token, i) => i > cursor && near.get(word).has(token));
            cursor = next; return next >= 0;
          });
          if (allowed(record) && orderedMatch) ranked.set(record, Math.max(ranked.get(record) || 0, 500));
        }
      }
    }
    const modifiers = ['demo', 'dlc', 'redkit', 'soundtrack', 'edition', 'remastered', 'enhanced', 'pack', 'expansion', 'sdk', 'editor', 'artbook'];
    const queryWords = variants.join(' ').split(' ');
    const penalty = record => record.tokens.some(token => modifiers.includes(token) && !queryWords.includes(token)) ? 30 : 0;
    const results = [...ranked].sort(([a, scoreA], [b, scoreB]) => (scoreB - penalty(b)) - (scoreA - penalty(a)) || a.game.title.length - b.game.title.length || a.game.title.localeCompare(b.game.title))
      .slice(0, Math.max(1, Math.min(20, limit))).map(([record, score]) => ({ ...record.game, approximate: score === 500 }));
    matchCache.set(cacheKey, results);
    if (matchCache.size > 100) matchCache.delete(matchCache.keys().next().value);
    return results;
  }
  function resolve(value) {
    const query = normalizeSearchQuery(value);
    for (const variant of [query, normalizeSearchQuery(keyboardSearchQuery(query))]) {
      const matches = aliases.get(searchKey(variant).replace(/\s/g, ''));
      if (matches?.length === 1) return matches[0].game.title;
    }
    return query;
  }
  return { find, resolve, size: records.length };
}
