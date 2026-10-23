import assert from 'node:assert/strict';
import test from 'node:test';
import { assertDiscoveryMetadata, verifyDiscovery } from './seo-discovery-smoke.mjs';

test('discovery checks reject remote or ambiguous origins before any fetch', async () => {
  for (const origin of ['https://gachia.com', 'http://localhost:8080', 'http://127.0.0.1', 'http://127.0.0.1:8080/path', 'http://u:p@127.0.0.1:8080']) {
    await assert.rejects(verifyDiscovery(origin, 'web'), /explicit local Worker origin/);
  }
});
test('discovery metadata requires exact canonical, robots and translated-only alternates', () => {
  const path = '/ja/genshin/guides/example';
  const snapshot = { canonical: `https://gachia.com${path}`, robots: 'noindex, follow', alternates: {
    'zh-Hans': 'https://gachia.com/zh/genshin/guides/example', en: 'https://gachia.com/en/genshin/guides/example', 'x-default': 'https://gachia.com/zh/genshin/guides/example',
  } };
  assertDiscoveryMetadata(snapshot, path, ['zh-Hans', 'en'], { noindex: true });
  for (const changed of [
    { ...snapshot, canonical: 'https://gachia.com/ja/genshin' },
    { ...snapshot, robots: 'index, follow' },
    { ...snapshot, robots: 'noindex, nofollow' },
    { ...snapshot, alternates: { ...snapshot.alternates, ja: snapshot.canonical } },
    { ...snapshot, alternates: { ...snapshot.alternates, en: 'https://gachia.com/en/en/genshin/guides/example' } },
  ]) assert.throws(() => assertDiscoveryMetadata(changed, path, ['zh-Hans', 'en'], { noindex: true }));
});
