/**
 * КЕШ ВІДПОВІДЕЙ: localStorage переживає F5, переходи між HTML і перезапуск Vite.
 * Зберігаємо тільки публічні дані CheapShark, без RAWG-ключа та даних користувача.
 * Якщо сховище заборонене/переповнене, залишається кеш у пам'яті.
 */
export function browserStorage() {
  try { return globalThis.localStorage; } catch { return null; }
}

export function createResponseCache({ storage = browserStorage(), prefix = 'playfinder:cheapshark:v2:', now = Date.now, maxEntries = 250 } = {}) {
  const memory = new Map();
  const entryPrefix = prefix + 'entry:';
  const storageKey = key => entryPrefix + key;
  function read(key) {
    let entry;
    try { entry = JSON.parse(storage?.getItem(storageKey(key)) || 'null'); } catch { /* Пошкоджений JSON — промах кешу. */ }
    entry ||= memory.get(key);
    return entry && Number.isFinite(entry.updatedAt) && Object.hasOwn(entry, 'data') ? entry : null;
  }
  function prune() {
    const entries = [];
    try {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key?.startsWith(entryPrefix)) {
          const entry = JSON.parse(storage.getItem(key));
          entries.push({ key, time: entry?.updatedAt || 0 });
        }
      }
      entries.sort((a, b) => a.time - b.time);
      // Залишаємо запас; видаляємо лише НАШІ найстаріші записи, не чужі дані.
      for (const entry of entries.slice(0, Math.max(0, entries.length - maxEntries + 20))) storage.removeItem(entry.key);
    } catch { /* Недоступне сховище не повинно ламати ціни. */ }
  }
  return {
    prefix,
    get(key, { ttl, maxAge = ttl, allowStale = false, validate = () => true }) {
      const entry = read(key);
      if (!entry || !validate(entry.data)) return null;
      const age = now() - entry.updatedAt;
      if (age < 0 || age > maxAge || (!allowStale && age >= ttl)) return null;
      return { data: entry.data, updatedAt: entry.updatedAt, stale: age >= ttl, source: 'cache' };
    },
    set(key, data, updatedAt = now()) {
      const entry = { data, updatedAt };
      memory.set(key, entry);
      if (memory.size > maxEntries) memory.delete(memory.keys().next().value);
      try {
        if (storage?.length >= maxEntries) prune();
        storage?.setItem(storageKey(key), JSON.stringify(entry));
      } catch {
        prune();
        try { storage?.setItem(storageKey(key), JSON.stringify(entry)); } catch { /* Кеш у пам'яті вже є. */ }
      }
    },
  };
}
