import assert from 'node:assert/strict';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import router from '../../../../apps/router/src/index.ts';
import { genshinPublicFixture } from '../../../../scripts/fixtures/unified-genshin-public-fixture.mjs';
import { verifyUnifiedGenshinPublic, recheckUnifiedGenshinPublic } from '../../../../scripts/unified-genshin-public.mjs';

test('Genshin public evidence composes with the actual Router and never accepts Main fallback', async t => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'genshin-public-router-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const f = genshinPublicFixture(), references = f.references(), dedicated = [], main = [];
  const env = {
    GENSHIN_ENABLED: 'true', GENSHIN_FULL_CUTOVER: 'true',
    GENSHIN_SITE: { fetch: async request => {
      const path = new URL(request.url).pathname; dedicated.push(path);
      const row = f.rows.find(row => row.path === path); assert(row, `Unreviewed dedicated path ${path}`);
      assert(!request.headers.has('authorization') && !request.headers.has('cookie'));
      return new Response(f.read(row), { status: row.status, headers: row.headers });
    } },
    MAIN_SITE: { fetch: async request => { main.push(new URL(request.url).pathname); return new Response('Wrong Main fallback', { status: 404 }); } },
  };
  const request = (url, options) => router.fetch(new Request(url, options), env);
  const directory = join(root, 'http'), result = await verifyUnifiedGenshinPublic({ references, directory, request });
  recheckUnifiedGenshinPublic(directory, result.evidenceSHA256, references);
  assert.equal(main.length, 0);
  assert.deepEqual(dedicated.sort(), [...f.requirements.map(row => row.path), '/sitemap.xml', '/_next/static/fixture.js'].sort());
  for (const fault of ['disabled', 'canary', 'absent-binding']) {
    const changed = { ...env, ...(fault === 'disabled' ? { GENSHIN_ENABLED: 'false' } : fault === 'canary'
      ? { GENSHIN_FULL_CUTOVER: 'false', GENSHIN_CANARY_TOKEN: 'fixture-only' } : { GENSHIN_SITE: undefined }) };
    await assert.rejects(verifyUnifiedGenshinPublic({ references, directory: join(root, fault),
      request: (url, options) => router.fetch(new Request(url, options), changed) }));
  }
});
