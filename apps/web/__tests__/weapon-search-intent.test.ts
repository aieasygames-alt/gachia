import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { Metadata } from 'next';
import ts from 'typescript';
import * as data from '../../game-genshin/lib/data';
import * as i18n from '../../game-genshin/lib/i18n';
import * as seo from '../../game-genshin/lib/seo';
import MainWeaponPage, { generateMetadata as mainMetadata } from '../app/[lang]/[game]/weapons/[id]/page';

type Params = { lang: string; id: string };

function dedicatedMetadata() {
  // Resolve the dedicated app's aliases without replacing its data or SEO helpers.
  const source = readFileSync(new URL('../../game-genshin/app/[lang]/genshin/weapons/[id]/page.tsx', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  const imports: Record<string, unknown> = {
    '@/lib/data': data,
    '@/lib/i18n': i18n,
    '@/lib/seo': seo,
    '@/components/game-nav': {},
    'next/link': {},
    'next/navigation': {},
    'react/jsx-runtime': {},
  };
  const exports: { generateMetadata?: (input: { params: Promise<Params> }) => Promise<Metadata> } = {};
  new Function('require', 'exports', compiled)((name: string) => {
    if (!(name in imports)) throw new Error(`Unexpected dedicated metadata dependency: ${name}`);
    return imports[name];
  }, exports);
  if (!exports.generateMetadata) throw new Error('Missing dedicated metadata export');
  return exports.generateMetadata;
}

describe('weapon search intent', () => {
  it('serves localized metadata for high-impression Genshin weapons only from the dedicated app', async () => {
    const generateMetadata = dedicatedMetadata();
    for (const id of ['wolf-fang', 'lost-prayer-to-the-sacred-winds', 'key-of-khaj-nisut']) {
      const weapon = data.getGenshinWeaponById(id);
      if (!weapon) throw new Error(`Missing dedicated weapon record: ${id}`);
      const url = (lang: string) => `https://gachia.com/${lang}/genshin/weapons/${id}`;
      for (const lang of ['zh', 'en', 'ja'] as const) {
        const title = `${data.getGenshinWeaponName(weapon, lang)} - Genshin Impact`;
        const description = data.getGenshinWeaponEffect(weapon, lang).description;
        expect(description.trim(), `${lang}/${id}`).not.toBe('');
        expect(await generateMetadata({ params: Promise.resolve({ lang, id }) })).toMatchObject({
          title, description,
          alternates: { canonical: url(lang), languages: { 'zh-Hans': url('zh'), en: url('en'), ja: url('ja') } },
          openGraph: { title, description, url: url(lang) },
          twitter: { title, description },
        });
        const params = Promise.resolve({ lang, game: 'genshin', id });
        expect(await mainMetadata({ params })).toEqual({});
        await expect(MainWeaponPage({ params })).rejects.toMatchObject({ digest: 'NEXT_HTTP_ERROR_FALLBACK;404' });
      }
    }
  });
});
