import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { dedicatedCharacterTextFields, escapeCharacterText } from '../../../services/content-cms/src/unified-character-text';
import { projectAzurRawNames } from '../../../services/content-cms/src/unified-consumers';

const game = process.env.CHARACTER_GAME;
const loaders = {
  genshin: async () => ({ data: await import('../../game-genshin/lib/data'), page: await import('../../game-genshin/app/[lang]/genshin/characters/[id]/page') }),
  nte: async () => ({ data: await import('../../game-nte/lib/data'), page: await import('../../game-nte/app/[lang]/nte/characters/[id]/page') }),
  'azur-promilia': async () => ({ data: await import('../../game-azur-promilia/lib/data'), page: await import('../../game-azur-promilia/app/[lang]/azur-promilia/characters/[id]/page') }),
  lvmeng: async () => ({ data: await import('../../game-lvmeng/lib/data'), page: await import('../../game-lvmeng/app/[lang]/lvmeng/characters/[slug]/page') }),
};
const loaded = await loaders[game]();
const data = loaded.data;
const page = loaded.page;
const characters = data[({ genshin: 'genshinCharacters', nte: 'nteCharacters', 'azur-promilia': 'characters', lvmeng: 'playableCharacters' })[game]];
const rows = game === 'azur-promilia'
  ? JSON.parse(readFileSync(new URL('../../../packages/data/games/azur-promilia/raw-characters.json', import.meta.url), 'utf8'))
  : characters;
const params = (id, lang) => ({ params: Promise.resolve({ id, slug: id, lang }) });
const set = (row, pointer, value) => {
  const keys = pointer.slice(1).split('/');
  const parent = keys.slice(0, -1).reduce((node, key) => node[key], row);
  parent[keys.at(-1)] = value;
};

// Exercise the actual frozen-build adapter, not a test-only name mapping.
function projectAzur() {
  if (game !== 'azur-promilia') return;
  const consumer = readFileSync(new URL('../../../packages/data/games/azur-promilia/characters.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(projectAzurRawNames(consumer, JSON.stringify(rows)), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  const exports = {};
  runInNewContext(compiled, { exports, require: id => {
    expect(id).toBe('./raw-characters.json');
    return rows;
  } });
  expect(exports.characters).toHaveLength(rows.length);
  characters.splice(0, characters.length, ...exports.characters);
}

describe(`${game} CMS existing character text to actual server page`, () => {
  it('renders every contracted field for every existing visible character in the actual locale consumers', async () => {
    const savedCharacters = [...characters];
    let fieldsChecked = 0, pagesChecked = 0;
    try {
      for (const row of rows) {
        const fields = dedicatedCharacterTextFields(game, row);
        const id = String(row.id ?? row.slug);
        const changed = fields.map(field => ({ ...field, next: `CMS-${game}-${id}-${field.pointer} & "quoted" 'text'` }));
        try {
          for (const field of changed) set(row, field.pointer, field.next);
          projectAzur();
          const expected = dedicatedCharacterTextFields(game, row);
          for (const lang of game === 'lvmeng' ? ['zh'] : ['zh', 'en', 'ja']) {
            const html = renderToStaticMarkup(await page.default(params(id, lang)));
            const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
            expect(main, id).toBeTruthy();
            for (const field of expected) {
              if (field.locales.includes(lang)) {
                expect(main, `${id}:${lang}:${field.pointer}`).toContain(`>${escapeCharacterText(field.value)}<`);
                fieldsChecked++;
              } else expect(main, `${id}:${lang}:${field.pointer}`).not.toContain(escapeCharacterText(field.value));
            }
            expect(await page.generateMetadata(params(id, lang))).toBeTruthy();
            pagesChecked++;
          }
        } finally {
          for (const field of fields) set(row, field.pointer, field.value);
          projectAzur();
        }
      }
    } finally { if (game === 'azur-promilia') characters.splice(0, characters.length, ...savedCharacters); }
    expect(fieldsChecked).toBeGreaterThan(rows.length);
    console.log(JSON.stringify({ game, characters: rows.length, fieldsChecked, pagesChecked, actualServerRendering: true, cloudWrites: false }));
  });

  it('keeps other locale output unchanged for a Chinese name-only edit', async () => {
    if (game === 'lvmeng') return;
    const row = rows[0], id = String(row.id), previous = row.name;
    const savedCharacters = [...characters];
    try {
      projectAzur();
      const before = await Promise.all(['en', 'ja'].map(async lang => renderToStaticMarkup(await page.default(params(id, lang)))));
      row.name = 'CMS-only-Chinese-name';
      projectAzur();
      expect(renderToStaticMarkup(await page.default(params(id, 'zh')))).toContain('CMS-only-Chinese-name');
      for (const [index, lang] of ['en', 'ja'].entries()) expect(renderToStaticMarkup(await page.default(params(id, lang)))).toBe(before[index]);
    } finally {
      row.name = previous;
      if (game === 'azur-promilia') characters.splice(0, characters.length, ...savedCharacters);
    }
  });
});
