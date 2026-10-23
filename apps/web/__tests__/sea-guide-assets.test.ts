import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadJson } from '@gachia/data/load-json';
import { getGuideListData } from '../lib/game-data/guides';

describe('Sea guide runtime consumers', () => {
  it('serves the source version through ASSETS when filesystem data is unavailable', async () => {
    const contextKey = Symbol.for('__cloudflare-context__');
    const globals = globalThis as unknown as Record<symbol, unknown>;
    const previous = globals[contextKey];
    const source = JSON.parse(await readFile(resolve('../../packages/data/games/sea/raw-guides.json'), 'utf8'));
    const paths: string[] = [];
    globals[contextKey] = { env: { ASSETS: { fetch: async (request: Request) => {
      const path = new URL(request.url).pathname;
      paths.push(path);
      return new Response(await readFile(resolve(`public${path}`), 'utf8'), { headers: { 'content-type': 'application/json' } });
    } } } };
    try {
      const raw = await loadJson(`/__missing__/${randomUUID()}`, '/data/sea/raw-guides.json');
      expect(raw).toEqual(source);
      const summary = await loadJson<Record<string, unknown>[]>(`/__missing__/${randomUUID()}`, '/data-client/sea/guides.json');
      expect(summary.map(entry => entry.id)).toEqual(source.map((entry: { id: string }) => entry.id));
      const detail = await loadJson(`/__missing__/${randomUUID()}`, `/data-client/sea/guides/${source[0].id}.json`);
      expect(detail).toEqual(source[0]);
      expect(paths).toHaveLength(3);
    } finally {
      if (previous === undefined) delete globals[contextKey];
      else globals[contextKey] = previous;
    }
  });

  it('uses matching localized titles and IDs in the list consumer', async () => {
    const source = JSON.parse(await readFile(resolve('../../packages/data/games/sea/raw-guides.json'), 'utf8'));
    for (const locale of ['zh', 'en', 'ja'] as const) {
      const list = await getGuideListData('sea', locale);
      expect(list.guides.map(entry => entry.id)).toEqual(source.map((entry: { id: string }) => entry.id));
      for (const [index, entry] of list.guides.entries()) {
        const guide = source[index];
        expect(entry.title).toBe(locale === 'zh' ? guide.title : locale === 'ja' ? (guide.titleJa ?? guide.titleEn) : guide.titleEn);
      }
    }
  });
});
