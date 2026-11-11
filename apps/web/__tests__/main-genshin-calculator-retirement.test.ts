import { existsSync, readFileSync } from 'node:fs';
import { NextRequest } from 'next/server';
import { expect, it } from 'vitest';
import CalculatorPage from '../app/[lang]/[game]/calculator/page';
import middleware from '../middleware';

it('removes Main Genshin calculator implementation and its dynamic entry', () => {
  const directory = new URL('../app/[lang]/[game]/calculator/', import.meta.url);
  expect(existsSync(new URL('genshin-calculator-client.tsx', directory))).toBe(false);
  expect(readFileSync(new URL('calculator-client.tsx', directory), 'utf8')).not.toContain('genshin-calculator-client');
});

it('refuses direct Main calculator rendering without a cacheable fallback', async () => {
  for (const lang of ['zh', 'en', 'ja']) {
    await expect(CalculatorPage({ params: Promise.resolve({ lang, game: 'genshin' }) })).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    for (const suffix of ['', '/unknown']) {
      const response = middleware(new NextRequest(`https://gachia.com/${lang}/genshin/calculator${suffix}`));
      expect(response.status).toBe(404); expect(response.headers.get('cache-control')).toBe('no-store'); expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    }
  }
});

it('keeps other calculators and the remaining Genshin tools unchanged', async () => {
  for (const game of ['starrail', 'wuwa', 'zzz', 'sea', 'skjh']) {
    expect(await CalculatorPage({ params: Promise.resolve({ lang: 'en', game }) })).toBeTruthy();
    const response = middleware(new NextRequest(`https://gachia.com/en/${game}/calculator`));
    expect(response.status, game).toBe(game === 'zzz' ? 301 : 200);
    if (game === 'zzz') expect(response.headers.get('location')).toBe('https://gachia.com/en/zzz');
  }
  for (const route of ['map']) expect(middleware(new NextRequest(`https://gachia.com/en/genshin/${route}`)).status).toBe(404);
});
