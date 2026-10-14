import { loadEnv } from 'vite';

const env = loadEnv('production', process.cwd(), 'VITE_');
const required = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
];
const missing = required.filter(name => !env[name]?.trim());

// Якщо забули налаштування, зупиняю публікацію до появи зламаної форми.
if (missing.length) {
  console.error(`Додай у GitHub Actions Secrets або Variables: ${missing.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log('Усі чотири налаштування Firebase присутні.');
}
