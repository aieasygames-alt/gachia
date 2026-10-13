import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startWorkbench } from '../src/server.mjs';

test('real browser occupancy cards keep foreign and pending previews non-actionable', { skip: process.env.WORKBENCH_BROWSER_TESTS !== '1' }, async (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'gachia-occupancy-browser-'));
  const app = await startWorkbench({ dataDir: dir, port: 0 });
  t.after(async () => { await app.close(); rmSync(dir, { recursive: true, force: true }); });
  const base = await (await fetch(`${app.origin}/api/state`, { headers: { Authorization: `Bearer ${app.token}` } })).json();
  const { chromium } = await import('@playwright/test'); const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 844 } }); let posts = 0;
      page.on('request', (request) => { if (request.method() === 'POST') posts++; });
      const state = { ...base, batches: [{ id: 'batch', title: 'Synthetic occupancy fixture', server: 'Global', deployment: { worker: 'gachia' }, baseline: {}, suggestedPages: [], factSnapshot: [] }],
        revisions: [{ id: 'revision', batchId: 'batch', number: 1, note: 'Fixture', snapshot: { confirmedFacts: [] }, assessment: { status: 'current', reasons: [] } }],
        workspaces: [{ id: 'workspace', revisionId: 'revision', path: '/synthetic-only', inspection: { status: 'blocked', note: 'UI fixture only', reasons: [], changes: [] } }],
        draftReviews: [{ id: 'review', workspaceId: 'workspace', number: 1, decision: 'accepted', reviewerType: 'agent', assessment: { status: 'current' } }],
        applicationPreviews: [] };
      await page.route('**/api/state', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(state) }));
      for (const scenario of [
        { status: 'starting', message: '其他或历史实例记录；未探测进程或端口。', blocksStart: true, check: false, stop: false, reconcile: false },
        { status: 'needs_reconciliation', message: '终态待保存；存储恢复后仅重试保存。', blocksStart: true, check: false, stop: false, reconcile: false },
        { status: 'running', message: '本实例仍持有该进程。', blocksStart: true, check: true, stop: true, reconcile: false },
        { status: 'stopped', message: '已保存终态；不表示已检查后代。', blocksStart: false, check: false, stop: false, reconcile: false },
      ]) {
        state.applicationPreviews = [{ id: 'preview', reviewId: 'review', status: scenario.status, assessment: { status: 'current' },
          occupancy: { message: scenario.message, blocksStart: scenario.blocksStart, actions: scenario } }];
        await page.goto(`${app.origin}/?fixture=${scenario.status}#token=${app.token}`);
        await page.getByRole('status').filter({ hasText: '本机已连接' }).waitFor();
        await page.locator('.draft-review-history > summary').click();
        const card = page.locator('.application-preview');
        assert.ok((await card.innerText()).includes(scenario.message));
        assert.equal(await card.getByRole('button', { name: '停止应用预览', exact: true }).isEnabled(), scenario.stop);
        assert.equal(await card.getByRole('button', { name: '检查页面、sitemap、搜索索引与搜索交互抽样', exact: true }).isEnabled(), scenario.check);
        assert.equal(await page.getByRole('button', { name: '运行真实 Next.js 预览（执行代码）', exact: true }).isEnabled(), !scenario.blocksStart);
        if (scenario.status === 'needs_reconciliation') assert.equal(await card.getByRole('button', { name: '确认旧进程和端口已停止' }).isDisabled(), true);
      }
      assert.equal(posts, 0); await page.close();
    }
  } finally { await browser.close(); }
});
