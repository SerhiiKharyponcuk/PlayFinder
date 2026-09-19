import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const pages = ['index', 'games', 'prices', 'about', 'game', 'favorites', 'login', 'privacy', 'terms'];
export default defineConfig({
  // GitHub Pages hosts this repository at /PlayFinder/.
  base: '/PlayFinder/',
  build: {
    rolldownOptions: {
      input: Object.fromEntries(pages.map(page => [page, fileURLToPath(new URL(page + '.html', import.meta.url))])),
    },
  },
});
