import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import * as core from '@gachia/core';
import * as seo from '@/lib/seo-metadata';
import * as scope from '@/lib/hi3-weapon-scope';

type Metadata = {
  title?: string;
  description?: string;
  openGraph?: { description: string; images: { url: string; width: number; height: number }[] };
  twitter?: { title: string; description: string; images: string[] };
};
type Params = { lang: string; game: string; id?: string };

// Execute the actual page metadata exports; stub rendering-only imports and data IO.
function metadataExport(page: string, detail: unknown) {
  const source = readFileSync(new URL(`../app/[lang]/[game]/weapons/${page}`, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
  } }).outputText;
  const exports: { generateMetadata?: (input: { params: Promise<Params> }) => Promise<Metadata> } = {};
  const imports: Record<string, unknown> = {
    '@gachia/core': core,
    '@/lib/seo-metadata': seo,
    '@/lib/hi3-weapon-scope': scope,
    '@/lib/game-data/weapons': { getWeaponDetailData: async () => detail },
    'next/dynamic': { default: () => null },
    'next/navigation': {},
    '@/lib/i18n/navigation': {},
    '@/lib/jsonld': {},
    '@/lib/jsonld-script': {},
    'react/jsx-runtime': {},
  };
  new Function('require', 'exports', compiled)((name: string) => {
    if (!(name in imports)) throw new Error(`Unexpected metadata dependency: ${name}`);
    return imports[name];
  }, exports);
  if (!exports.generateMetadata) throw new Error('Missing metadata export');
  return (params: Params) => exports.generateMetadata!({ params: Promise.resolve(params) });
}

describe('weapon page metadata behavior (not rendered Next head)', () => {
  for (const locale of ['zh', 'en', 'ja'] as const) {
    for (const page of ['page.tsx', '[id]/page.tsx']) {
      it(`${page} keeps ${locale} HI3 boundaries on all social descriptions`, async () => {
        const generate = metadataExport(page, { name: 'Long name '.repeat(100) });
        const metadata = await generate({ lang: locale, game: 'hi3', id: 'vermillion-liuli-full-burn' });
        const description = scope.hi3WeaponMetadata(locale).description;
        expect(metadata.description).toBe(description);
        expect(metadata.openGraph?.description).toBe(description);
        expect(metadata.twitter?.description).toBe(description);
        expect(metadata.twitter?.title).toBe(metadata.title);
        expect(metadata.title).toContain(scope.hi3WeaponMetadata(locale).title);
        expect(metadata.openGraph?.images).toEqual([
          { url: 'https://gachia.com/images/og/hi3.webp', width: 1024, height: 1024 },
        ]);
        expect(metadata.twitter?.images).toEqual(['https://gachia.com/images/og/hi3.webp']);
      });
    }
  }

  for (const page of ['page.tsx', '[id]/page.tsx']) {
    it(`${page} leaves other games without a new Twitter override or square image`, async () => {
      const generate = metadataExport(page, { name: 'Fixture', effectDescription: '', statsLine: '' });
      const metadata = await generate({ lang: 'en', game: 'genshin', id: 'fixture-not-an-override' });
      expect(metadata.twitter).toBeUndefined();
      expect(metadata.openGraph?.images).toEqual([
        { url: 'https://gachia.com/images/og/genshin.webp', width: 1200, height: 630 },
      ]);
    });
  }

  it('missing detail returns no metadata instead of inventing an announcement', async () => {
    expect(await metadataExport('[id]/page.tsx', null)({ lang: 'en', game: 'hi3', id: 'missing' })).toEqual({});
  });
});
