import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import router from './index';
import { nteContentAssets } from '../../../scripts/nte-content-assets.mjs';
import { genshinContentAssets } from '../../../scripts/genshin-content-assets.mjs';
import { ntePlatformSchema } from '../../../packages/core/nte-platform';

const root = resolve(import.meta.dirname, '../../..');
const nte = nteContentAssets(root), genshin = genshinContentAssets(root);
const worker = action => ({
  fetch: action, connect: () => { throw new Error('unused'); },
});
const json = value => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
const contentWorker = content => worker(request => {
  const path = new URL(request.url).pathname;
  const bytes = content.files.get(path.slice(content.contract.prefix.length + 1));
  return bytes ? new Response(bytes, { headers: { 'content-type': 'application/json' } }) : new Response(null, { status: 404 });
});
const main = worker(request => {
  const path = new URL(request.url).pathname;
  if (!path.startsWith('/data-manifest/')) return new Response('main');
  const base = JSON.parse(readFileSync(resolve(root, `apps/web/public${path}`), 'utf8'));
  // Both dedicated slices are absent from the migrated Main, and must be merged.
  if (path.endsWith('/games.json')) { delete base.games.genshin; delete base.games.nte; }
  else { delete base.genshin; delete base.nte; }
  return json(base);
});
const environment = () => ({ MAIN_SITE: main, NTE_SITE: contentWorker(nte), NTE_CONTENT_ENABLED: 'true',
  GENSHIN_SITE: contentWorker(genshin), GENSHIN_ENABLED: 'true', GENSHIN_FULL_CUTOVER: 'true', GENSHIN_CONTENT_ENABLED: 'true' });

describe('independent NTE data alongside the already independent Genshin owner', () => {
  it('exports only explicitly registered public NTE records and validates the platform', () => {
    expect(nte.files.size).toBe(nte.contract.rawFiles.length + 6);
    expect(nte.files.has('data/raw-image-sources.json')).toBe(false);
    expect(ntePlatformSchema.parse(JSON.parse(nte.files.get('platform.json').toString())).owner).toBe('nte');
  });
  for (const fragment of ['games.json', 'search-zh.json', 'search-en.json', 'search-ja.json']) it(`merges both fresh owner fragments: ${fragment}`, async () => {
    const path = `/data-manifest/${fragment}`, response = await router.fetch(new Request('https://gachia.com' + path), environment());
    expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('no-store');
    const value = await response.json();
    const data = fragment === 'games.json' ? value.games : value;
    expect(data.nte).toEqual(JSON.parse(nte.files.get(fragment).toString()).data);
    expect(data.genshin).toEqual(JSON.parse(genshin.files.get(fragment).toString()).data);
    const before = JSON.parse(readFileSync(resolve(root, `apps/web/public${path}`), 'utf8'));
    if (fragment === 'games.json') { delete value.games.nte; delete value.games.genshin; delete before.games.nte; delete before.games.genshin; }
    else { delete value.nte; delete value.genshin; delete before.nte; delete before.genshin; }
    expect(value).toEqual(before);
    expect(response.headers.get('x-gachia-content-version')).toBe(genshin.manifest.version);
    expect(response.headers.get('x-gachia-nte-content-version')).toBe(nte.manifest.version);
  });
  for (const file of nte.contract.rawFiles) it(`serves owner raw JSON at the existing URL: ${file}`, async () => {
    const response = await router.fetch(new Request(`https://gachia.com/data/nte/${file}`), environment());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(JSON.parse(nte.files.get(`data/${file}`).toString()));
  });
  it('uses defaults until the explicit migration switch is enabled', async () => {
    const response = await router.fetch(new Request('https://gachia.com/data/nte/raw-materials.json'), { ...environment(), NTE_CONTENT_ENABLED: undefined });
    expect(await response.text()).toBe('main');
  });
  it('does not fall back when an enabled owner is unavailable or another owner fails', async () => {
    for (const env of [
      { ...environment(), NTE_SITE: undefined }, { ...environment(), NTE_ENABLED: 'false' },
      { ...environment(), NTE_SITE: worker(() => new Response(null, { status: 500 })) },
      { ...environment(), GENSHIN_SITE: worker(() => new Response(null, { status: 500 })) },
    ]) {
      const response = await router.fetch(new Request('https://gachia.com/data-manifest/search-en.json'), env);
      expect(response.status).toBe(503); expect(response.headers.get('cache-control')).toBe('no-store');
    }
  });
  it('supports HEAD, refuses writes and unknown raw paths without exposing the source-only inventory', async () => {
    const env = environment();
    const head = await router.fetch(new Request('https://gachia.com/data-client/nte-platform.json', { method: 'HEAD' }), env);
    expect(head.status).toBe(200); expect(await head.text()).toBe('');
    for (const method of ['POST', 'PUT', 'DELETE']) expect((await router.fetch(new Request('https://gachia.com/data/nte/raw-materials.json', { method }), env)).status).toBe(405);
    expect((await router.fetch(new Request('https://gachia.com/data/nte/raw-image-sources.json'), env)).status).toBe(404);
  });
});
