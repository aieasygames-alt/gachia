import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blocksEntireSite, sitemapPathForOrigin } from './robots-policy.mjs';

test('does not mistake an API restriction for a whole-site block', () => {
  assert.equal(blocksEntireSite('User-agent: *\nAllow: /\nDisallow: /api/'), false);
  assert.equal(blocksEntireSite('disallow: / # preview\n'), true);
  assert.equal(blocksEntireSite('Disallow: /\r\n'), true);
  assert.equal(blocksEntireSite('Disallow: /*?token='), false);
});

test('uses the Router game sitemap only on the public domain', () => {
  assert.equal(sitemapPathForOrigin('https://gachia.com'), '/sitemaps/lvmeng/index.xml');
  assert.equal(sitemapPathForOrigin('https://www.gachia.com'), '/sitemaps/lvmeng/index.xml');
  assert.equal(sitemapPathForOrigin('https://example.workers.dev'), '/sitemap.xml');
});
