import { readFile } from 'node:fs/promises';
import Handlebars from 'handlebars';

/** Vite компілює .hbs ДО відправлення в браузер.
 * На уроці редагуйте src/templates/*.hbs, як раніше. ?template повертає вже
 * готову функцію; у браузер потрапляє тільки маленький handlebars/runtime.
 * Цей файл не викликає API і не містить даних чи ключів користувача.
 */
export function handlebarsPlugin() {
  return {
    name: 'playfinder-handlebars',
    enforce: 'pre',
    async load(id) {
      if (!id.endsWith('.hbs?template')) return;
      const path = id.slice(0, -'?template'.length);
      this.addWatchFile(path);
      const source = await readFile(path, 'utf8');
      return 'import Handlebars from "handlebars/runtime";\nexport default Handlebars.template(' + Handlebars.precompile(source) + ');';
    },
  };
}
