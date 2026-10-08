import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { handlebarsPlugin } from './scripts/handlebars-plugin.js';

const pages = ['index', 'games', 'about', 'game', 'favorites', 'login', 'privacy', 'terms'];
export default defineConfig({

  base: '/PlayFinder/',
  plugins: [handlebarsPlugin()],
  build: {
    manifest: true,
    rolldownOptions: {
      input: Object.fromEntries(pages.map(page => [page, fileURLToPath(new URL(page + '.html', import.meta.url))])),
    },
  },
});
