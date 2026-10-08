import { calendarToday } from '../utils/release.js';

export const RAWG_GENRE_IDS = Object.freeze({ action: 4, adventure: 3, rpg: 5, strategy: 10,
  simulation: 14, sport: 15, racing: 1, indie: 51, shooter: 2, puzzle: 7, platformer: 83, fighting: 6 });
export const RAWG_TAG_IDS = Object.freeze({ horror: 16, 'co-op': 18, 'open-world': 36 });
export const RAWG_PLATFORM_IDS = Object.freeze({ pc: 1, playstation: 2, xbox: 3, nintendo: 7, linux: 6 });
export const RAWG_STORE_IDS = Object.freeze({ steam: 1, epic: 11, gog: 5, xbox: 2, itch: 9,
  google: 8, playstation: 3, nintendo: 6, apple: 4 });
export const FILTER_LABELS = Object.freeze({
  genre: { action: 'Екшен', adventure: 'Пригоди', rpg: 'RPG', strategy: 'Стратегії', simulation: 'Симулятори',
    sport: 'Спорт', racing: 'Гонки', indie: 'Інді', horror: 'Жахи', 'co-op': 'Кооператив',
    'open-world': 'Відкритий світ', shooter: 'Шутери', puzzle: 'Головоломки', platformer: 'Платформери', fighting: 'Файтинги' },
  platform: { pc: 'PC', playstation: 'PlayStation', xbox: 'Xbox', nintendo: 'Nintendo', linux: 'Linux' },
  store: { steam: 'Steam', epic: 'Epic Games', gog: 'GOG', xbox: 'Xbox Store', itch: 'itch.io',
    google: 'Google Play', playstation: 'PlayStation Store', nintendo: 'Nintendo Store', apple: 'App Store' },
});

export function normalizeSort(value) {
  if (value === 'newest') return 'release';
  return ['popular', 'rating', 'release', 'price-low', 'price-high'].includes(value) ? value : 'popular';
}
export function normalizeChoices(value, choices) {
  return [...new Set(String(value || '').split(',').filter(key => Object.hasOwn(choices, key)))].sort().join(',');
}
export function normalizeGenre(value) { return normalizeChoices(value, FILTER_LABELS.genre); }
export function normalizeYear(value) {
  return /^\d{4}$/.test(String(value)) && Number(value) >= 1900 && Number(value) <= 2100 ? String(value) : '';
}
export function releaseDates({ year, release, sort }, today = calendarToday()) {
  let start = '1900-01-01', end = '2100-12-31';
  if (year) { start = `${year}-01-01`; end = `${year}-12-31`; }
  if (release === 'upcoming') {
    const tomorrow = new Date(today + 'T12:00:00Z'); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    start = [start, tomorrow.toISOString().slice(0, 10)].sort().at(-1);
  } else if (release === 'recent') {
    const past = new Date(today + 'T12:00:00Z'); past.setUTCDate(past.getUTCDate() - 90);
    start = [start, past.toISOString().slice(0, 10)].sort().at(-1);
    end = [end, today].sort()[0];
  } else if (sort === 'release' && !year) end = today;
  return { empty: start > end, dates: year || release || sort === 'release' ? `${start},${end}` : '' };
}
