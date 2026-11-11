import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { expect, it } from 'vitest';
import TeamsPage from '../app/[lang]/[game]/teams/page';
import middleware from '../middleware';

it('removes Main Genshin teams and unused inline resonance copies without changing other tools', () => {
  const directory = new URL('../app/[lang]/[game]/teams/', import.meta.url);
  expect(existsSync(new URL('genshin-teams-client.tsx', directory))).toBe(false);
  const source = readFileSync(new URL('teams-client.tsx', directory), 'utf8');
  for (const token of ['genshin-teams-client', 'GENSHIN_ELEMENTS', 'ELEMENT_RESONANCES', 'getResonances']) expect(source).not.toContain(token);
  // R107's original byte slices, pinned without requiring local report files in CI.
  const hash = (text: string) => createHash('sha256').update(text).digest('hex');
  expect(hash(source.slice(source.indexOf('type SquadSize')))).toBe('1e2b3318422f56c549ba7cc16297062c177db9ce09a9d0dc88752ad5435fbb27');
  expect(hash(source.slice(source.indexOf('function getTeamNextSteps'), source.indexOf('// =====================================================================')))).toBe('a8e6c22469cd136abe33a0ca3b8935c2c0831bb83307cb3542a0d6f0ed954c13');
});

it('refuses direct Main teams in all locales including descendants with no-store/noindex', async () => {
  for (const lang of ['zh', 'en', 'ja']) {
    await expect(TeamsPage({ params: Promise.resolve({ lang, game: 'genshin' }) })).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
    for (const suffix of ['', '/unknown']) {
      const response = middleware(new NextRequest(`https://gachia.com/${lang}/genshin/teams${suffix}`));
      expect(response.status).toBe(404); expect(response.headers.get('cache-control')).toBe('no-store'); expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    }
  }
});

it('preserves other teams, redirect policy, and remaining Genshin tools', async () => {
  for (const game of ['starrail', 'wuwa', 'zzz', 'skjh', 'endfield', 'sea']) {
    expect(await TeamsPage({ params: Promise.resolve({ lang: 'en', game }) })).toBeTruthy();
    expect(middleware(new NextRequest(`https://gachia.com/en/${game}/teams`)).status).toBe(game === 'sea' ? 301 : 200);
  }
  for (const route of ['map']) expect(middleware(new NextRequest(`https://gachia.com/en/genshin/${route}`)).status).toBe(404);
});
