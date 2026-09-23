/** Єдине місце читання .env.local. URL сервера і ключ — різні поля!
 * Після зміни env перезапусти Vite. VITE_* потрапляють у браузер.
 * Не використовуй тут Firebase Admin SDK / service account / приватні серверні ключі.
 */
const env = import.meta.env ?? {};
export const config = Object.freeze({
  locale: 'uk-UA', currency: 'USD', pageSize: 12, requestTimeout: 10000,
  rawg: { baseUrl: 'https://api.rawg.io/api', apiKey: env.VITE_RAWG_API_KEY || '' },
  cheapshark: { baseUrl: 'https://www.cheapshark.com/api/1.0' },
  firebase: {
    apiKey: env.VITE_FIREBASE_API_KEY || '',
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: env.VITE_FIREBASE_PROJECT_ID || '',
    appId: env.VITE_FIREBASE_APP_ID || '',
  },
});
