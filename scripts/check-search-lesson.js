import { readFile } from 'node:fs/promises';
import { normalizeSearchQuery } from '../src/js/features/search-query.js';

const cases = JSON.parse(await readFile(new URL('../lessons/search/cases.json', import.meta.url), 'utf8'));
let completed = 0;
for (const { input, expected, reason } of cases) {
  const actual = normalizeSearchQuery(input);
  const ready = actual === expected;
  if (ready) completed++;
  console.log(`${ready ? 'ГОТОВО' : 'ЗАВДАННЯ'}: ${reason}`);
  console.log(`  Ввід: ${JSON.stringify(input)}`);
  console.log(`  Зараз: ${JSON.stringify(actual)}; очікуємо: ${JSON.stringify(expected)}`);
}
console.log(`\nГотово ${completed} із ${cases.length} прикладів.`);
if (completed < cases.length) console.log('Решту дописуємо на уроці у src/js/features/search-query.js.');
else console.log('Усі приклади готові. Перевірте пошук у браузері та виконайте npm run build.');
