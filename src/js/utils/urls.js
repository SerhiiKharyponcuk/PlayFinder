// API-дані не вставляємо як довільний HTML або javascript: URL.
export function safeImage(value) {
  try { const url = new URL(value); if (url.protocol === 'https:') return url.href; } catch {}
  return (import.meta.env?.BASE_URL || '/PlayFinder/') + 'images/game-placeholder.svg';
}
