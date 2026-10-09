import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const TARGET = 10_000;
const PAGE_SIZE = 40;
const root = fileURLToPath(new URL('../', import.meta.url));
const output = new URL('../src/js/data/search-games.js', import.meta.url);
const metadata = new URL('../src/js/data/search-games.meta.json', import.meta.url);
const cache = new URL('../artifacts.local/search-data/', import.meta.url);

function normalizeGame(item) {
  if (!Number.isSafeInteger(item?.id) || item.id <= 0 || typeof item.name !== 'string' || typeof item.slug !== 'string') return null;
  const name = item.name.trim().replace(/\s+/g, ' ');
  const slug = item.slug.trim();
  return name && slug ? { id: item.id, name, slug } : null;
}

async function readPage(file) {
  try {
    const page = JSON.parse(await readFile(file, 'utf8'));
    if (Array.isArray(page.games) && page.games.length && page.games.every(game => normalizeGame(game))) return page;
  } catch {}
  return null;
}

async function build() {
  try {
    const existing = await import(output.href);
    const games = Object.values(existing.SEARCH_GAMES);
    if (games.length === TARGET && games.every(game => normalizeGame(game))) {
      console.log(`У файлі вже є ${TARGET} ігор. Нових запитів: 0.`);
      return;
    }
  } catch {}

  const apiKey = loadEnv('development', root, 'VITE_RAWG_API_KEY').VITE_RAWG_API_KEY;
  if (!apiKey) throw new Error('Додай VITE_RAWG_API_KEY у .env.local. Ключ потрібен тільки для першого завантаження списку.');
  await mkdir(new URL('../src/js/data/', import.meta.url), { recursive: true });
  await mkdir(cache, { recursive: true });
  const games = new Map();
  let requests = 0, cachedPages = 0, page = 1;
  let firstFetchedAt = '', lastFetchedAt = '';

  while (games.size < TARGET && page <= 400) {
    const pageFile = new URL(`rawg-${String(page).padStart(4, '0')}.json`, cache);
    let batch = await readPage(pageFile);
    if (batch) cachedPages++;
    else {
      if (requests) await new Promise(resolve => setTimeout(resolve, 300));
      const url = new URL('https://api.rawg.io/api/games');
      url.search = new URLSearchParams({ key: apiKey, ordering: '-added', page_size: String(PAGE_SIZE), page: String(page) });
      let response;
      requests++;
      try { response = await fetch(url, { signal: AbortSignal.timeout(20_000), headers: { Accept: 'application/json' } }); }
      catch { throw new Error(`RAWG не відповів на сторінці ${page}. Завантажені сторінки збережені; повторний запуск продовжить роботу.`); }
      if (!response.ok) throw new Error(`RAWG повернув HTTP ${response.status} на сторінці ${page}. Зупинено без повторних запитів; завантажені сторінки збережені.`);
      let data;
      try { data = await response.json(); }
      catch { throw new Error(`RAWG повернув некоректний JSON на сторінці ${page}.`); }
      if (!Array.isArray(data.results) || !data.results.length) throw new Error(`Список RAWG завершився на ${games.size} іграх; штучні записи не додаються.`);
      batch = { fetchedAt: new Date().toISOString(), games: data.results.map(normalizeGame).filter(Boolean) };
      if (!batch.games.length) throw new Error(`Немає придатних записів на сторінці ${page}.`);
      await writeFile(pageFile, JSON.stringify(batch), 'utf8');
    }
    firstFetchedAt ||= batch.fetchedAt;
    lastFetchedAt = batch.fetchedAt;
    for (const game of batch.games) {
      if (games.size === TARGET) break;
      games.set(String(game.id), game);
    }
    if (page === 1 || page % 10 === 0 || games.size === TARGET) console.log(`Ігор: ${games.size}/${TARGET}; сторінок: ${page}; нових запитів: ${requests}; із кешу: ${cachedPages}.`);
    page++;
  }
  if (games.size !== TARGET) throw new Error(`Збережено ${games.size} унікальних ігор; потрібно ${TARGET}. Готовий об'єкт ще не створено.`);

  const entries = [...games].map(([id, game]) => `  ${JSON.stringify(id)}: ${JSON.stringify(game)}`).join(',\n');
  const source = `export const SEARCH_GAMES = {\n${entries}\n};\n\nexport const SEARCH_GAMES_LIST = Object.values(SEARCH_GAMES);\n`;
  const temporary = new URL('../src/js/data/search-games.js.tmp', import.meta.url);
  await writeFile(temporary, source, 'utf8');
  await rename(temporary, output);
  await writeFile(metadata, JSON.stringify({
    source: 'RAWG', sourceUrl: 'https://rawg.io/apidocs', ordering: '-added',
    count: games.size, pageSize: PAGE_SIZE, sourcePages: page - 1, requestsThisRun: requests, cachedPagesThisRun: cachedPages,
    firstFetchedAt, lastFetchedAt, generatedAt: new Date().toISOString(), bytes: Buffer.byteLength(source),
  }, null, 2) + '\n', 'utf8');
  console.log(`Готовий об'єкт: src/js/data/search-games.js. Ігор: ${games.size}. Розмір: ${Math.round(Buffer.byteLength(source) / 1024)} КБ.`);
}

try { await build(); }
catch (error) { console.error(error.message); process.exitCode = 1; }
