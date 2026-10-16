import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startWorkbench } from '../src/server.mjs';
import { openStore } from '../src/store.mjs';
import { validateEvidence, scanContent, baseline, buildBatch } from '../src/content.mjs';

const root = resolve(fileURLToPath(new URL('../../..', import.meta.url)));
const dataDir = mkdtempSync(join(tmpdir(), 'batch-browser-synthetic-'));
const report = { decision: 'not_started', serviceStartAttempts: 0, cases: [], thirdPartyBlocked: 0, errors: [], dailyDatabaseAccess: false };
let app; let browser;
try {
  const store = openStore(join(dataDir, 'workbench.sqlite'));
  try {
    for (const width of [1440, 390]) {
      const evidence = store.importEvidence(validateEvidence({ title: `Synthetic closure ${width}`, body: `Synthetic quote ${width}`, url: `https://example.com/${width}`, sourceType: 'official_claim', language: 'en', server: 'Global', publishedAt: '' })).evidence;
      const fact = store.createFact({ evidenceId: evidence.id, entity: 'Synthetic', field: 'name', value: evidence.body, quote: evidence.body, server: 'Global', lifecycle: 'announced', validFrom: '', validUntil: '' }).fact;
      store.reviewFact({ factId: fact.id, expectedRevision: fact.revision, decision: 'confirmed', reviewer: 'synthetic-agent', reviewerType: 'agent', authorizationBasis: 'Synthetic browser test only', note: 'Synthetic only', sourceChecked: true, scopeChecked: true, valueChecked: true });
      store.createBatch(evidence.id, (item, facts) => buildBatch(item, scanContent(root), baseline(root), facts));
    }
  } finally { store.close(); }
  // Browser availability is checked before consuming the single service start.
  browser = await chromium.launch({ headless: true });
  report.serviceStartAttempts++;
  app = await startWorkbench({ root, dataDir, port: 0 });
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    await context.route('**/*', (route) => {
      if (new URL(route.request().url()).origin !== app.origin) { report.thirdPartyBlocked++; return route.abort(); }
      return route.continue();
    });
    const page = await context.newPage(); page.on('pageerror', (e) => report.errors.push(e.message));
    await page.goto(`${app.origin}/#token=${app.token}`);
    await page.getByRole('status').filter({ hasText: '本机已连接' }).waitFor();
    assert.equal(new URL(page.url()).hash, '');
    const card = page.locator('#batch-list article').filter({ has: page.getByRole('heading', { name: `Synthetic closure ${width}`, exact: true }) });
    await card.getByText('核对后无需更新：结束任务', { exact: true }).click();
    const form = card.locator('form').filter({ has: page.getByRole('button', { name: '记录无需更新并结束', exact: true }) });
    await form.getByLabel('结束理由', { exact: true }).fill('Synthetic already covered');
    await form.getByLabel('已核对的现有资料路径、实体及覆盖情况', { exact: true }).fill('Synthetic path/entity coverage only');
    await form.getByLabel('记录者', { exact: true }).fill('synthetic-browser-agent');
    await form.locator('select[name=reviewerType]').selectOption('agent');
    assert.equal(await form.locator('[name=authorizationBasis]').getAttribute('required'), '');
    await form.locator('[name=authorizationBasis]').fill('Synthetic acceptance only');
    await form.locator('input[type=checkbox]').check();
    await form.getByRole('button', { name: '记录无需更新并结束', exact: true }).click();
    await card.getByText('CLOSED / 无需更新，已结束', { exact: true }).waitFor();
    assert.equal(await card.getByText('选择已确认事实，创建任务修订', { exact: true }).count(), 0);
    assert.ok((await card.innerText()).includes('代理（自报）'));
    await page.reload(); await card.getByText('CLOSED / 无需更新，已结束', { exact: true }).waitFor();
    const state = await page.evaluate(async () => {
      const response = await fetch('/api/state', { headers: { Authorization: `Bearer ${sessionStorage.getItem('workbenchToken')}` } });
      return response.json();
    });
    const batch = state.batches.find((item) => item.title === `Synthetic closure ${width}`);
    assert.equal(state.batchLifecycles[batch.id].contextCurrent, true);
    assert.equal(state.events.filter((e) => e.kind === 'batch.closed_no_update' && e.objectId === batch.id).length, 1);
    assert.equal(batch.capabilities.publish, false);
    report.cases.push({ width, closeThroughRealUi: true, reloadPersisted: true, agentIdentityVisible: true, contextCurrent: true, revisionUiRemoved: true, singleAuditEvent: true });
    await context.close();
  }
  assert.deepEqual(report.errors, []);
  report.decision = 'accepted_browser_desktop_mobile';
} catch (error) {
  report.decision = 'failed'; report.failure = error.message; process.exitCode = 1;
} finally {
  await browser?.close();
  await app?.close(); report.serviceClosed = Boolean(app);
  rmSync(dataDir, { recursive: true, force: true });
  if (process.env.BATCH_BROWSER_REPORT) writeFileSync(process.env.BATCH_BROWSER_REPORT, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
}
