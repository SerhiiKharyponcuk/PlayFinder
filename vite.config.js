import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const pages = ['index', 'games', 'prices', 'about', 'game', 'favorites', 'login', 'privacy', 'terms'];
export default defineConfig({
  build: {
    rolldownOptions: {
      input: Object.fromEntries(pages.map(page => [page, fileURLToPath(new URL(page + '.html', import.meta.url))])),
    },
  },
});
