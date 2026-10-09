export function normalizeSearchQuery(value) {
  const query = String(value ?? '').trim();
  return query.replace(/[\s]+/g, ' ');
}

// Генерація alias-ів для кожної гри
export function generateAliases(games) {
  const aliases = {};

  for (const game of games) {
    const name = game.name;
    const slug = game.slug;

    // Додаємо slug → повна назва
    aliases[slug] = name;

    // Додаємо скорочення без пробілів
    const short = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    aliases[short] = name;

    // Додаємо скорочення з цифрами (типу gta5)
    const numeric = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    aliases[numeric] = name;

    // Додаємо варіант без цифр (типу gta)
    const noDigits = numeric.replace(/[0-9]/g, "");
    if (noDigits.length > 2) aliases[noDigits] = name;

    // Додаємо перші літери слів (типу tw3 → The Witcher 3)
    const acronym = name
      .split(" ")
      .map(w => w[0].toLowerCase())
      .join("");
    if (acronym.length > 1) aliases[acronym] = name;
  }

  return aliases;
}