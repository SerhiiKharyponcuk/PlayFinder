import { readFile } from 'node:fs/promises';
import Handlebars from 'handlebars';

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
