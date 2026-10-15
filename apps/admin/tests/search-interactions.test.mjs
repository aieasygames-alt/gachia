import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { searchSamples, checkSearchInteractions, checkSearchEmptyAndClose } from '../src/search-interactions.mjs';

const plan = { changes: [{ dataset: 'weapons', id: 'one', type: 'added' }, { dataset: 'weapons', id: 'two', type: 'modified' },
  { dataset: 'characters', id: 'old', type: 'deleted' }, { dataset: 'guides', id: 'guide', type: 'added' }] };
const review = { snapshot: { contents: [{ path: 'packages/data/games/hi3/raw-weapons.json',
  content: '[{"id":"one","name":"测试","nameEn":"Test","nameJa":"テスト"}]' }] } };
test('search sampling is bounded, localized and explicitly records skipped entities', () => {
  const { samples, notCovered } = searchSamples(plan, review);
  assert.equal(samples.length, 3);
  assert.deepEqual(samples.map((item) => item.query), ['测试', 'Test', 'テスト']);
  assert.equal(samples[2].path, '/ja/hi3/weapons/one');
  assert.deepEqual(notCovered.map((item) => item.entityId), ['two', 'old']);
});

test('real browser check verifies empty results and both close/reset paths and detects broken backdrop', { skip: process.env.WORKBENCH_BROWSER_TESTS !== '1' }, async () => {
  let broken = false;
  const server = createServer((req, res) => {
    if (req.url.startsWith('/data-manifest/')) { res.setHeader('Content-Type', 'application/json'); res.end('{"hi3":{"weapons":[{"id":"one","name":"Test"}]}}'); return; }
    const locale = req.url.split('/')[1];
    const message = { zh: '未找到相关结果', en: 'No results found', ja: '該当する結果がありません' }[locale];
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>
      <button onclick="openSearch()">Search</button><div id="overlay" hidden style="position:fixed;inset:0" onclick="${broken ? '' : "if(event.target===this)closeSearch()"}">
      <div role="dialog" style="position:absolute;top:100px;left:20px"><input oninput="document.querySelector('p').hidden=false"><p hidden>${message}</p></div></div>
      <script>const overlay=document.querySelector('#overlay');const trigger=document.querySelector('button');const input=document.querySelector('input');function closeSearch(){overlay.hidden=true;trigger.focus();}function openSearch(){overlay.hidden=false;input.value='';input.focus();fetch('/data-manifest/search-${locale}.json');}window.addEventListener('keydown',e=>{if(e.key==='Escape')closeSearch();if(e.key==='Tab'&&!overlay.hidden){e.preventDefault();input.focus();}});</script></body></html>`);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { chromium } = await import('@playwright/test'); let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const origin = `http://127.0.0.1:${server.address().port}`;
    for (const profile of ['desktop', 'mobile']) {
      const context = await browser.newContext(profile === 'mobile' ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : {});
      const checks = await checkSearchEmptyAndClose(context, origin, () => {}, profile);
      assert.equal(checks.filter((item) => item.status === 'passed').length, 3);
      await context.close();
    }
    broken = true;
    const context = await browser.newContext();
    const checks = await checkSearchEmptyAndClose(context, origin, () => {});
    assert.equal(checks.filter((item) => item.status === 'failed' && item.escapeClosed && !item.backdropClosed).length, 3);
  } finally { await browser?.close(); await new Promise((resolve) => server.close(resolve)); }
});

test('real browser check searches and clicks localized results, rejects wrong target language', { skip: process.env.WORKBENCH_BROWSER_TESTS !== '1' }, async () => {
  let broken = false; let overflow = false; let unnamed = false; let escapeFocus = false;
  const server = createServer((req, res) => {
    const locale = req.url.split('/')[1]; const path = `/${locale}/hi3/weapons/one`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`<html lang="${broken ? 'wrong' : locale}"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="canonical" href="https://gachia.com${req.url}"></head><body><h1>Test</h1>
      <button onclick="document.querySelector('[role=dialog]').hidden=false">${unnamed ? '<span aria-hidden="true">Icon</span>' : 'Search'}</button>
      <div role="dialog" ${overflow ? 'style="width:900px"' : ''} hidden><input oninput="document.querySelector('a').textContent=this.value"><a href="${path}"></a></div>
      <script>window.addEventListener('keydown',e=>{if(e.key!=='Tab'||${escapeFocus})return;const input=document.querySelector('input'),link=document.querySelector('a');if((e.shiftKey&&document.activeElement===input)||(!e.shiftKey&&document.activeElement===link)){e.preventDefault();(e.shiftKey?link:input).focus();}});</script></body></html>`);
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { chromium } = await import('@playwright/test');
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const origin = `http://127.0.0.1:${server.address().port}`;
    let assertions = 0;
    const checks = await checkSearchInteractions(context, origin, plan, review, () => assertions++);
    assert.equal(checks.filter((item) => item.ruleId === 'search.ui_sample' && item.status === 'passed').length, 3);
    assert.equal(assertions, 6);
    const keyboard = await checkSearchInteractions(context, origin, plan, review, () => {}, 'desktop', true);
    assert.equal(keyboard.filter((item) => item.status === 'passed' && item.targetKeyboardFocused && item.forwardTabWrapped && item.reverseTabWrapped).length, 3);
    escapeFocus = true;
    const escaped = await checkSearchInteractions(context, origin, plan, review, () => {}, 'desktop', true);
    assert.equal(escaped.filter((item) => item.status === 'failed' && !item.reverseTabWrapped).length, 3);
    escapeFocus = false;
    broken = true;
    const failed = await checkSearchInteractions(context, origin, plan, review, () => {});
    assert.equal(failed.filter((item) => item.status === 'failed').length, 3);
    broken = false;
    const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const mobileChecks = await checkSearchInteractions(mobile, origin, plan, review, () => {}, 'mobile');
    assert.equal(mobileChecks.filter((item) => item.status === 'passed').length, 3);
    assert.ok(mobileChecks.filter((item) => item.ruleId === 'search.ui_sample').every((item) => item.profile === 'mobile' && item.viewport.width === 390 && item.dialogInViewport));
    overflow = true;
    const overflowChecks = await checkSearchInteractions(mobile, origin, plan, review, () => {}, 'mobile');
    assert.equal(overflowChecks.filter((item) => item.status === 'failed' && !item.dialogInViewport).length, 3);
    overflow = false; unnamed = true;
    const missingName = await checkSearchInteractions(mobile, origin, { changes: [plan.changes[0]] }, review, () => {}, 'mobile');
    assert.equal(missingName.filter((item) => item.status === 'failed').length, 3);
  } finally { await browser?.close(); await new Promise((resolve) => server.close(resolve)); }
});
