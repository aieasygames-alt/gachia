import { existsSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import CharacterDetailPage from '../app/[lang]/[game]/characters/[id]/page';

it('removes the retired Main Genshin detail component and its entry import', () => {
  const directory = new URL('../app/[lang]/[game]/characters/[id]/', import.meta.url);
  expect(existsSync(new URL('genshin-character-detail.tsx', directory))).toBe(false);
  expect(readFileSync(new URL('page.tsx', directory), 'utf8')).not.toContain('genshin-character-detail');
});

it('rejects direct retired Genshin character rendering, including unknown IDs', async () => {
  for (const id of ['hu-tao', 'not-a-character']) await expect(CharacterDetailPage({ params: Promise.resolve({ lang: 'en', game: 'genshin', id }) })).rejects.toThrow('NEXT_HTTP_ERROR_FALLBACK;404');
});
