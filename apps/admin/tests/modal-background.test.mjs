import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

test('real browser search arrows navigate links without stealing composition, modifiers or native Enter', { skip: process.env.WORKBENCH_BROWSER_TESTS !== '1' }, async () => {
  const source = readFileSync(new URL('../../web/lib/search-keyboard.ts', import.meta.url), 'utf8');
  const script = ts.transpileModule(source.replace(/export function/g, 'function'), { compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022 } }).outputText.replace('export function', 'function');
  const { chromium } = await import('@playwright/test'); const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 } }); const page = await context.newPage();
      await page.setContent('<div id="dialog"><input id="query"><button id="retry">Retry</button><a id="one" data-search-result href="#one">One</a><a id="two" data-search-result href="#two">Two</a></div>');
      await page.addScriptTag({ content: script });
      await page.evaluate(() => { window.addEventListener('keydown', (event) => moveSearchFocus(event, document.querySelector('#dialog'), document.querySelector('#query'))); });
      await page.locator('#query').focus();
      for (const [key, expected] of [['ArrowDown', 'one'], ['ArrowDown', 'two'], ['ArrowDown', 'query'], ['ArrowUp', 'two'], ['ArrowUp', 'one'], ['ArrowUp', 'query']]) {
        await page.keyboard.press(key); assert.equal(await page.evaluate(() => document.activeElement.id), expected);
      }
      const ignored = await page.evaluate(() => {
        const input = document.querySelector('#query'); const dialog = document.querySelector('#dialog');
        return [{ isComposing: true }, { ctrlKey: true }, { metaKey: true }, { altKey: true }, { shiftKey: true }].map((extra) => {
          const event = new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true, ...extra });
          return [moveSearchFocus(event, dialog, input), event.defaultPrevented, document.activeElement.id];
        });
      });
      assert.ok(ignored.every(([handled, prevented, focused]) => !handled && !prevented && focused === 'query'));
      await page.locator('#retry').focus(); await page.keyboard.press('ArrowDown');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'retry');
      await page.locator('#query').focus(); await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
      assert.equal(new URL(page.url()).hash, '#one');
      await page.evaluate(() => { document.querySelectorAll('a').forEach((item) => item.remove()); document.querySelector('#query').focus(); });
      await page.keyboard.press('ArrowDown'); assert.equal(await page.evaluate(() => document.activeElement.id), 'query');
      await context.close();
    }
  } finally { await browser.close(); }
});

test('real browser overlapping modal owners survive both close orders and preserve scroll priority', { skip: process.env.WORKBENCH_BROWSER_TESTS !== '1' }, async () => {
  const source = readFileSync(new URL('../../web/lib/modal-background.ts', import.meta.url), 'utf8');
  const script = ts.transpileModule(source.replace(/export function/g, 'function'), { compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022 } }).outputText.replace('export function', 'function');
  const { chromium } = await import('@playwright/test'); const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1440, 390]) for (const order of ['older_first', 'newer_first']) {
      const page = await browser.newPage({ viewport: { width, height: 844 } });
      await page.setContent('<body style="overflow:scroll !important"><main><button>Background</button></main><aside inert></aside><div id="first"><button id="one">One</button></div></body>');
      await page.addScriptTag({ content: script });
      await page.evaluate(() => {
        window.first = isolateModalBackground(document.querySelector('#first'));
        const next = document.createElement('div'); next.id = 'second'; next.innerHTML = '<button id="two">Two</button>'; document.body.append(next);
      });
      await page.waitForFunction(() => document.querySelector('#second').inert);
      await page.evaluate(() => { window.second = isolateModalBackground(document.querySelector('#second')); document.querySelector('#two').focus(); });
      assert.deepEqual(await page.evaluate(() => [document.querySelector('#first').inert, document.querySelector('#second').inert, document.activeElement.id, document.body.style.overflow]), [true, false, 'two', 'hidden']);
      await page.evaluate((order) => { if (order === 'older_first') { window.first(); document.querySelector('#first').remove(); } else { window.second(); document.querySelector('#second').remove(); document.querySelector('#one').focus(); } }, order);
      assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
      await page.evaluate((order) => { if (order === 'older_first') { window.second(); window.first(); } else { window.first(); window.second(); } }, order);
      assert.deepEqual(await page.evaluate(() => [document.querySelector('main').inert, document.querySelector('aside').inert, document.body.style.overflow, document.body.style.getPropertyPriority('overflow')]), [false, true, 'scroll', 'important']);
      await page.close();
    }
  } finally { await browser.close(); }
});

test('real browser modal background is inert, dynamic siblings isolated and exact state restored', { skip: process.env.WORKBENCH_BROWSER_TESTS !== '1' }, async () => {
  const source = readFileSync(new URL('../../web/lib/modal-background.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source.replace(/export function/g, 'function'), { compilerOptions: { module: ts.ModuleKind.None, target: ts.ScriptTarget.ES2022 } }).outputText;
  const script = compiled.replace('export function', 'function');
  const { chromium } = await import('@playwright/test'); const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 844 } }); const page = await context.newPage();
      await page.setContent('<body style="overflow:scroll"><header><button id="trigger">Search</button><div id="branch"><div id="overlay"><input id="query"></div><button id="sibling">Sibling</button></div></header><main><button id="background">Background</button></main><aside inert>Previously inert</aside></body>');
      await page.addScriptTag({ content: script });
      await page.evaluate(() => {
        document.querySelector('#trigger').focus();
        window.restore = isolateModalBackground(document.querySelector('#overlay'));
        document.querySelector('#query').focus();
      });
      assert.deepEqual(await page.evaluate(() => ({
        main: document.querySelector('main').inert, sibling: document.querySelector('#sibling').inert,
        trigger: document.querySelector('#trigger').inert, branch: document.querySelector('#branch').inert,
        overlay: document.querySelector('#overlay').inert, overflow: document.body.style.overflow,
      })), { main: true, sibling: true, trigger: true, branch: false, overlay: false, overflow: 'hidden' });
      await page.evaluate(() => document.querySelector('#background').focus());
      assert.equal(await page.evaluate(() => document.activeElement.id), 'query');
      await page.evaluate(() => { const button = document.createElement('button'); button.id = 'late'; document.body.append(button); });
      await page.waitForFunction(() => document.querySelector('#late').inert);
      await page.evaluate(() => { window.restore(); window.restore(); document.querySelector('#trigger').focus(); });
      assert.deepEqual(await page.evaluate(() => ({ main: document.querySelector('main').inert,
        prior: document.querySelector('aside').inert, late: document.querySelector('#late').inert,
        overflow: document.body.style.overflow, focused: document.activeElement.id })),
      { main: false, prior: true, late: false, overflow: 'scroll', focused: 'trigger' });
      await context.close();
    }
  } finally { await browser.close(); }
});
