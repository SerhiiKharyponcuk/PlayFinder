// Імпортуємо очищення, нормалізацію запиту, конвертацію розкладки, ключ пошуку та генератор скорочень.
import { cleanSearchQuery, normalizeSearchQuery, keyboardSearchQuery, searchKey, gameSearchAliases } from '../features/search-query.js';

// Перевіряє, чи відрізняються два слова не більше ніж на задану кількість редакторських помилок.
export function withinEditDistance(left, right, maximum = 1) {
  // Якщо довжини слів уже різняться більше за дозволену межу, потрібної схожості бути не може.
  if (Math.abs(left.length - right.length) > maximum) return false;
  // Зберігає попередній рядок таблиці відстаней; початковий рядок має значення 0..right.length.
  // beforePrevious потрібен для врахування перестановки двох сусідніх літер.
  let previous = Array.from({ length: right.length + 1 }, (_, i) => i), beforePrevious;
  // Посимвольно порівнюємо left із right, оновлюючи відстані для кожного префікса.
  for (let i = 1; i <= left.length; i++) {
    // Перший стовпець — вартість перетворення перших i літер left на порожній рядок.
    const current = [i];
    // Рахуємо мінімальну кількість вставок, видалень і замін для префіксів right.
    for (let j = 1; j <= right.length; j++) {
      // Обираємо найдешевший варіант: вставити, видалити або залишити/замінити символ.
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1));
      // Якщо два сусідні символи поміняні місцями, враховуємо це як одну помилку.
      if (i > 1 && j > 1 && left[i - 1] === right[j - 2] && left[i - 2] === right[j - 1]) current[j] = Math.min(current[j], beforePrevious[j - 2] + 1);
    }
    // Зсуваємо рядки таблиці для наступної ітерації, не зберігаючи всю таблицю цілком.
    beforePrevious = previous; previous = current;
  }
  // Повертаємо true, якщо відстань між словами не перевищила максимум.
  return previous[right.length] <= maximum;
}

// Готує ігри до пошуку та повертає методи знаходження результатів і нормалізації запиту.
export function createSearchIndex(games) {
  // Set для відстеження вже доданих ID та словника слів із назв ігор.
  const ids = new Set(), vocabulary = new Set();
  // Перетворюємо масив ігор або значення об'єкта з іграми на список записів пошукового індексу.
  const records = (Array.isArray(games) ? games : Object.values(games || {})).flatMap(game => {
    // Приводимо ID до рядка та беремо очищену назву з поля name або title.
    const id = String(game?.id ?? ''), title = cleanSearchQuery(game?.name ?? game?.title);
    // Пропускаємо запис із неправильним ID, порожньою назвою або ID, який уже додали.
    if (!/^[\w-]+$/.test(id) || !title || ids.has(id)) return [];
    // Запам'ятовуємо ID, щоб не додати дублікат гри.
    ids.add(id);
    // Готуємо нормалізований текст назви, окремі слова та можливі скорочення назви.
    const key = searchKey(title), tokens = key.split(' '), aliases = gameSearchAliases(game);
    // Додаємо слова назви до словника, який використовуватиметься для знаходження схожих слів.
    tokens.forEach(token => vocabulary.add(token));
    // Повертаємо внутрішній запис: дані для показу й поля, потрібні алгоритму пошуку.
    return [{ game: { id, title, slug: game.slug || '', image: game.image || '', platforms: game.platforms || [] }, key, tokens, aliases,
      // compact — назва без пробілів; numbers — цифри, які мають збігатися точно.
      compact: key.replace(/\s/g, ''), numbers: tokens.filter(token => /^\d+$/.test(token)) }];
  });
  // Створюємо мапу скорочення -> ігри, яким це скорочення відповідає.
  const aliases = new Map();
  // Проходимо кожен запис і додаємо його до списку для кожного з його скорочень.
  for (const record of records) for (const key of record.aliases) {
    // Створюємо порожній список для скорочення, якщо воно зустрілося вперше.
    if (!aliases.has(key)) aliases.set(key, []);
    // Зберігаємо гру, якій відповідає це скорочення; неоднозначність перевіримо під час resolve.
    aliases.get(key).push(record);
  }
  // Кешуємо результати однакових запитів, щоб не повторювати обчислення.
  const matchCache = new Map();
  // Шукає ігри за запитом і повертає не більше limit найкращих результатів.
  function find(query, limit = 6) {
    // Нормалізуємо запит так само, як назви та відомі скорочення.
    const normalized = normalizeSearchQuery(query);
    // Для запитів коротших за два символи результатів не показуємо.
    if (normalized.length < 2) return [];
    // Ключ кешу враховує і текст запиту, і кількість потрібних результатів.
    const cacheKey = normalized.toLowerCase() + ':' + limit;
    // Якщо такий пошук уже виконували, повертаємо збережені результати.
    if (matchCache.has(cacheKey)) return matchCache.get(cacheKey);
    // Перевіряємо звичайний запит і варіант після виправлення розкладки; прибираємо дублікати та порожні ключі.
    const variants = [...new Set([searchKey(normalized), searchKey(normalizeSearchQuery(keyboardSearchQuery(normalized)))])].filter(Boolean);
    // Зберігаємо оцінку найкращого збігу для кожної гри.
    const ranked = new Map();
    // Оцінюємо кожен варіант запиту окремо.
    for (const needle of variants) {
      // Розкладаємо запит на слова, робимо компактну версію та виділяємо числа.
      const words = needle.split(' '), compact = needle.replace(/\s/g, ''), numbers = words.filter(word => /^\d+$/.test(word));
      // Не підходять ігри, в назві яких відсутнє будь-яке число із запиту.
      const allowed = record => numbers.every(number => record.numbers.includes(number));
      // Порівнюємо запит з усіма записами локального індексу.
      for (const record of records) {
        // Пропускаємо гру, якщо її числова частина не відповідає запиту.
        if (!allowed(record)) continue;
        // Початкова оцінка означає, що збігу ще не знайдено.
        let score = 0;
        // Точний збіг назви без пробілів отримує найвищий пріоритет.
        if (record.compact === compact) score = 1000;
        // Точне збігання зі скороченням отримує майже такий самий пріоритет.
        else if (record.aliases.includes(compact)) score = 950;
        // Назва, що починається з повного запиту, має високий пріоритет.
        else if (record.key.startsWith(needle)) score = 900;
        // Всі слова запиту можуть збігатися з початками слів у назві; цифри мають збігатися повністю.
        else if (words.every(word => record.tokens.some(token => /^\d+$/.test(word) ? token === word : token.startsWith(word)))) score = 850;
        // Збіг фрагмента всередині назви має нижчий пріоритет.
        else if (record.key.includes(needle)) score = 600;
        // Частковий збіг із початком скорочення допомагає знаходити гру за неповним введенням.
        else if (compact.length >= 2 && record.aliases.some(alias => alias.startsWith(compact))) score = 700;
        // Записуємо оцінку, якщо збіг є, та зберігаємо кращу оцінку з різних варіантів запиту.
        if (score) ranked.set(record, Math.max(ranked.get(record) || 0, score));
      }
      // Якщо результатів поки замало та є достатньо довге слово, додатково шукаємо друкарські помилки.
      if (ranked.size < limit && words.some(word => word.length >= 4 && word.length <= 48 && !/^\d+$/.test(word))) {
        // Для кожного слова запиту знаходимо слова зі словника з відстанню редагування в межах 1 або 2.
        const near = new Map(words.map(word => [word, new Set([...vocabulary].filter(token => token === word ||
          (!/^\d+$/.test(word) && word.length >= 4 && word.length <= 48 && withinEditDistance(word, token, word.length >= 8 ? 2 : 1))))]));
        // Перевіряємо записи, чи містять вони схожі слова запиту у правильному порядку.
        for (const record of records) {
          // Індекс останнього знайденого слова; наступні слова шукаємо після нього.
          let cursor = -1;
          // Кожне слово запиту має відповідати наступному слову назви або близькому до нього варіанту.
          const orderedMatch = words.every(word => {
            // Шукаємо найближче відповідне слово після попереднього збігу.
            const next = record.tokens.findIndex((token, i) => i > cursor && near.get(word).has(token));
            // Пересуваємо курсор і повертаємо, чи знайшлося відповідне слово.
            cursor = next; return next >= 0;
          });
          // Додаємо приблизний збіг із базовою оцінкою 500, якщо порядок слів правильний.
          if (allowed(record) && orderedMatch) ranked.set(record, Math.max(ranked.get(record) || 0, 500));
        }
      }
    }
    // Ці слова позначають додатковий контент/видання, які не варто ставити вище основної гри без запиту на них.
    const modifiers = ['demo', 'dlc', 'redkit', 'soundtrack', 'edition', 'remastered', 'enhanced', 'pack', 'expansion', 'sdk', 'editor', 'artbook'];
    // Об'єднуємо слова всіх варіантів запиту для визначення запитаних модифікаторів.
    const queryWords = variants.join(' ').split(' ');
    // Знижуємо оцінку назви з модифікатором, якщо користувач його не вводив.
    const penalty = record => record.tokens.some(token => modifiers.includes(token) && !queryWords.includes(token)) ? 30 : 0;
    // Сортуємо за оцінкою з урахуванням штрафу, потім за коротшою назвою та алфавітом.
    const results = [...ranked].sort(([a, scoreA], [b, scoreB]) => (scoreB - penalty(b)) - (scoreA - penalty(a)) || a.game.title.length - b.game.title.length || a.game.title.localeCompare(b.game.title))
      // Обмежуємо кількість результатів значенням від 1 до 20 і додаємо ознаку приблизного збігу.
      .slice(0, Math.max(1, Math.min(20, limit))).map(([record, score]) => ({ ...record.game, approximate: score === 500 }));
    // Кешуємо знайдені результати для повторного запиту з тим самим текстом і лімітом.
    matchCache.set(cacheKey, results);
    // Обмежуємо кеш сотнею записів, видаляючи найдавніший доданий ключ.
    if (matchCache.size > 100) matchCache.delete(matchCache.keys().next().value);
    // Повертаємо відсортований список ігор.
    return results;
  }
  // Знаходить канонічну назву гри для однозначного запиту або скорочення.
  function resolve(value) {
    // Спершу нормалізуємо введення та перевіряємо можливий варіант після зміни розкладки.
    const query = normalizeSearchQuery(value);
    // Шукаємо відповідне скорочення для обох варіантів запиту.
    for (const variant of [query, normalizeSearchQuery(keyboardSearchQuery(query))]) {
      // Прибираємо пробіли з ключа, щоб пробіли в скороченні не впливали на пошук.
      const matches = aliases.get(searchKey(variant).replace(/\s/g, ''));
      // Повертаємо назву лише тоді, коли скорочення відповідає рівно одній грі.
      if (matches?.length === 1) return matches[0].game.title;
    }
    // Якщо однозначного скорочення немає, залишаємо початковий нормалізований запит.
    return query;
  }
  // Повертаємо пошук, нормалізацію запиту та кількість коректних унікальних записів індексу.
  return { find, resolve, size: records.length };
}
