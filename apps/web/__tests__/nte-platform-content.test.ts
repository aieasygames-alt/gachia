import { describe, expect, it, vi } from 'vitest';
import platform from '../public/data-client/nte-platform.json';
import { readNtePlatformContent } from '../lib/nte-platform-content';
import { composeHomepageContent } from '../lib/homepage-content';
import { ntePlatformSchema } from '../../../packages/core/nte-platform';

const binding = (action: () => Promise<Response>) => ({ fetch: action }) as Pick<Fetcher, 'fetch'>;
const response = (value: unknown) => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
describe('NTE platform content reads', () => {
  it('reads the compatibility asset until explicitly enabled and then reads the sole game owner', async () => {
    const paths: string[] = [];
    const fetch = async (input: RequestInfo | URL) => { paths.push(input instanceof Request ? input.url : String(input)); return response(platform); };
    expect(await readNtePlatformContent({ ASSETS: { fetch } })).toEqual(platform);
    expect(await readNtePlatformContent({ NTE_CONTENT_ENABLED: 'true', NTE_CONTENT: { fetch }, ASSETS: binding(async () => { throw new Error('stale Main read'); }) })).toEqual(platform);
    expect(paths).toEqual(['https://gachia.com/data-client/nte-platform.json', 'https://gachia.com/_games/nte/content/platform.json']);
  });
  it('updates homepage names from the current owner while preserving the Genshin result and other game modules', () => {
    const current = ntePlatformSchema.parse(platform), next = structuredClone(current);
    next.data.characters.find(row => row.id === 'nanally')!.name.en = 'Current owner name';
    const a = composeHomepageContent(null, new Date(), current), b = composeHomepageContent(null, new Date(), next);
    expect(b.nteFeatured.find(row => row.id === 'nanally')?.name.en).toBe('Current owner name');
    expect(b.banners).toEqual(a.banners); expect(b.versions).toEqual(a.versions); expect(b.featured).toEqual(a.featured);
    expect(composeHomepageContent(null).nteFeatured).toEqual([]);
    expect(composeHomepageContent(null).nteUnavailable).toBe(true);
  });
  it.each(['absent', 'status', 'mime', 'cookie', 'owner', 'oversize'])('fails closed for %s without reading stale Main assets', async fault => {
    const stale = vi.fn(async () => response(platform));
    const game = binding(async () => {
      if (fault === 'status') return new Response(null, { status: 503 });
      if (fault === 'owner') return response({ ...platform, owner: 'genshin' });
      return new Response(fault === 'oversize' ? ' '.repeat(512 * 1024 + 1) : JSON.stringify(platform), {
        headers: { 'content-type': fault === 'mime' ? 'text/html' : 'application/json', ...(fault === 'cookie' ? { 'set-cookie': 'session=private' } : {}) },
      });
    });
    await expect(readNtePlatformContent({ NTE_CONTENT_ENABLED: 'true', NTE_CONTENT: fault === 'absent' ? undefined : game, ASSETS: binding(stale) })).rejects.toThrow();
    expect(stale).not.toHaveBeenCalled();
  });
});
