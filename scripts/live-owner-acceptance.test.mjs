import assert from 'node:assert/strict';
import test from 'node:test';
import { missingSectionExpectation, nteJapaneseGuideIndexable, sitemapLocations, validateAcceptanceOrigin } from './live-owner-acceptance.mjs';

test('unknown Main-owned NTE section is exactly a hub redirect, never a dedicated detail 404', () => {
  assert.deepEqual(missingSectionExpectation('nte', 'production'), { status: 301, location: '/zh/nte' });
  for (const game of ['nte', 'lvmeng']) for (const phase of ['local', 'preview', 'production']) {
    if (game === 'nte' && phase === 'production') continue;
    assert.deepEqual(missingSectionExpectation(game, phase), { status: 404, location: null });
  }
  assert.throws(() => missingSectionExpectation('genshin', 'production'));
});

test('acceptance allows only local, public production or exact owner version preview origins', () => {
  for (const game of ['nte', 'lvmeng']) {
    validateAcceptanceOrigin(game, 'http://127.0.0.1:12345', 'local');
    validateAcceptanceOrigin(game, 'https://gachia.com', 'production');
    validateAcceptanceOrigin(game, `https://1234abcd-gachia-game-${game}.aieasygames.workers.dev`, 'preview');
    for (const origin of ['https://example.com', 'https://gachia.com/path', 'https://gachia.com@evil.invalid', 'http://localhost:12345', `https://gachia-game-${game}.aieasygames.workers.dev`]) {
      assert.throws(() => validateAcceptanceOrigin(game, origin, 'preview'));
    }
  }
  assert.throws(() => validateAcceptanceOrigin('genshin', 'https://gachia.com', 'production'));
});

test('XML parser rejects wrong roots, duplicate locs and entity declarations', () => {
  const xml = '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://gachia.com/zh/nte</loc></url></urlset>';
  assert.deepEqual(sitemapLocations(xml), ['https://gachia.com/zh/nte']);
  for (const bad of [xml.replace('urlset', 'sitemapindex'), xml.replace('</urlset>', '<url><loc>https://gachia.com/zh/nte</loc></url></urlset>'), '<!DOCTYPE test>' + xml]) assert.throws(() => sitemapLocations(bad));
});

test('Japanese acceptance matches production minimum length and Japanese text policy', () => {
  const good = { titleJa: 'あ'.repeat(8), summaryJa: 'あ'.repeat(40), contentJa: 'あ'.repeat(200) };
  assert.equal(nteJapaneseGuideIndexable(good), true);
  for (const bad of [{}, { ...good, titleJa: 'あ'.repeat(7) }, { ...good, summaryJa: 'あ'.repeat(39) }, { ...good, contentJa: 'a'.repeat(200) }]) assert.equal(nteJapaneseGuideIndexable(bad), false);
});
