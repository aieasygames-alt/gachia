import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { inspectShadowHTML } from './shadow-consistency-audit.mjs';

export async function auditShadowBrowser({ fixture, origins, owners, sampler, label }) {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const owner of owners) {
      const context = await browser.newContext();
      const pending = [], failures = [];
      let automaticPrefetchRequests = 0;
      await context.route('**/*', async route => {
        const request = route.request();
        if (new URL(request.url()).hostname !== '127.0.0.1') return route.abort();
        if (request.headers().rsc !== '1') return route.continue();
        if (request.headers()['next-router-prefetch'] === '1') automaticPrefetchRequests++;
        // Capture the actual upstream Flight bytes before delivery; Chromium may evict
        // prefetched response bodies before response.body() can retrieve them via CDP.
        const capture = (async () => {
          const response = await route.fetch();
          const bytes = await response.body();
          const row = await sampler.persist(`${label}-${owner}-browser-flight`, response.url(), response.status(), response.headers(), bytes,
            await request.allHeaders(), 'playwright-intercepted-upstream-body');
          assert.match(row.headers['content-type'], /text\/x-component/);
          assert.equal(row.status, 200);
          await route.fulfill({ response, body: bytes });
        })().catch(async error => { failures.push(String(error)); await route.abort().catch(() => {}); });
        pending.push(capture);
        await capture;
      });
      const page = await context.newPage();
      const pages = Object.values(fixture.snapshots).flatMap(snapshot => snapshot.pages).filter(row => row.owner === owner);
      assert.ok(pages.length >= 2);
      const url = path => origins[owner] + `/shadow/${fixture.release.releaseKey}${path}`;
      const prefetch = await sampler.sample(`${label}-${owner}-explicit-prefetch`, url(pages[1].path), { headers: { RSC: '1', 'Next-Router-Prefetch': '1' } });
      assert.equal(prefetch.status, 200);
      assert.match(prefetch.headers['content-type'], /text\/x-component/);
      assert.match(prefetch.headers['cache-control'], /no-store/);
      assert.ok(!/(?:^|\n)[a-f0-9]+:E\{/.test(prefetch.text));
      const prefetchContainsPage = prefetch.text.includes(pages[1].body);
      if (prefetchContainsPage) assert.ok(prefetch.text.includes('data-shadow-release') && prefetch.text.includes(fixture.release.releaseKey));
      await page.goto(url(pages[0].path), { waitUntil: 'networkidle' });
      await Promise.all(pending);
      inspectShadowHTML(await page.content(), { releaseKey: fixture.release.releaseKey, owner, page: pages[0] });
      await page.evaluate(() => { window.__shadowNavigationSentinel = 'same-document'; });
      const nextPath = `/shadow/${fixture.release.releaseKey}${pages[1].path}`;
      await page.locator(`a[data-shadow-navigation][href="${nextPath}"]`).click();
      await expect(page.locator('[data-shadow-body]')).toHaveText(pages[1].body);
      await expect(page).toHaveTitle(pages[1].title);
      const next = inspectShadowHTML(await page.content(), { releaseKey: fixture.release.releaseKey, owner, page: pages[1] });
      assert.equal(await page.evaluate(() => window.__shadowNavigationSentinel), 'same-document', 'must be client navigation, not document reload');
      await page.waitForLoadState('networkidle');
      await Promise.all(pending);
      await page.goBack();
      await expect(page.locator('[data-shadow-body]')).toHaveText(pages[0].body);
      await expect(page).toHaveTitle(pages[0].title);
      inspectShadowHTML(await page.content(), { releaseKey: fixture.release.releaseKey, owner, page: pages[0] });
      await page.waitForLoadState('networkidle');
      await Promise.all(pending);
      assert.deepEqual(failures, []);
      assert.ok(pending.length > 0, 'browser must request Flight payloads');
      results.push({ owner, releaseKey: fixture.release.releaseKey, clientNavigation: true, backNavigation: true, flightResponses: pending.length,
        explicitPrefetchProtocol: true, prefetchContainsPage, automaticPrefetchRequests,
        contextId: next.contextId, boundary: 'same-release synthetic pages; explicit protocol prefetch is not automatic browser prefetch; no real-content approval or stale-client revocation' });
      await context.close();
    }
  } finally { await browser.close(); }
  return results;
}

export async function auditNteLegacyNetwork({ semantics, origins, sampler }) {
  const decode = text => text.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const rows = [];
  for (const locale of ['zh', 'en', 'ja']) {
    const collection = await sampler.sample(`real-${locale}-nte-collection`, `${origins.nte}/${locale}/nte/items`);
    assert.equal(collection.status, 200);
    const expected = semantics.pages.filter(row => row.locale === locale);
    const titles = [...collection.text.matchAll(/class="card__title"[^>]*>([^<]*)</g)].map(match => decode(match[1]));
    assert.deepEqual(titles, expected.map(row => row.nte.name), 'real collection order and names');
    const descriptions = [...collection.text.matchAll(/class="card__meta"[^>]*>([\s\S]*?)<\/div>/g)].map(match => decode(match[1].replace(/<!--.*?-->/g, '')));
    assert.deepEqual(descriptions, expected.map(row => row.nte.displayType + (row.nte.source ? ` · ${row.nte.source}` : '')), 'real collection labels and locale source suppression');
    assert.ok(!collection.text.includes('data-shadow-release='));
    for (const id of ['light-dye', 'tri-key']) {
      const item = expected.find(row => row.id === id); assert.ok(item);
      const response = await sampler.sample(`real-${locale}-main-${id}`, origins.main + item.path);
      assert.equal(response.status, 200);
      assert.ok(decode(response.text).includes(item.main.name));
      assert.ok(decode(response.text).includes(item.main.source));
      assert.ok(decode(response.text).includes(item.main.displayType));
      assert.ok(!response.text.includes('data-shadow-release='));
      const jsonLd = [...response.text.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
      assert.ok(jsonLd.some(row => JSON.stringify(row).includes(item.main.name)), 'real JSON-LD must refer to the material');
      assert.ok(decode(response.text.match(/<title>([^<]*)<\/title>/)?.[1] ?? '').includes(item.main.name));
      rows.push({ locale, id, mainPath: item.path, collectionPath: item.collectionPath, jsonLdDocuments: jsonLd.length, authority: 'legacy', cmsEquivalent: false });
    }
  }
  return rows;
}
