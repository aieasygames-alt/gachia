import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { openStore } from '../src/store.mjs';
import { scanContent, baseline, buildBatch } from '../src/content.mjs';
import { workspaceService } from '../src/workspaces.mjs';
import { uncoveredRules } from '../src/draft-reviews.mjs';
import { startWorkbench } from '../src/server.mjs';

// Test repositories must not inherit the runner's global LFS/checkout filters.
// Repository-local filters (including deliberately unsafe fixtures) still apply.
process.env.GIT_CONFIG_GLOBAL = '/dev/null';
process.env.GIT_CONFIG_NOSYSTEM = '1';

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'gachia-workspace-'));
  let store;
  t.after(() => {
    try { store?.close(); }
    finally { rmSync(directory, { recursive: true, force: true }); }
  });
  const root = join(directory, 'repo'); mkdirSync(root);
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  git('init'); git('config', 'user.email', 'test@example.com'); git('config', 'user.name', 'Test');
  for (const folder of ['packages/data/games/hi3', 'apps/web/public/data/hi3']) {
    mkdirSync(join(root, folder), { recursive: true });
    for (const kind of ['characters', 'weapons', 'materials', 'guides', 'astral-ops', 'stigma-sets']) {
      const label = kind === 'guides' ? 'title' : 'name';
      const row = { id: 'example', [label]: '角色A', [`${label}En`]: 'A', [`${label}Ja`]: 'A' };
      for (const field of kind === 'guides' ? ['summary', 'content'] : kind === 'materials' ? ['source'] : ['description']) {
        for (const suffix of ['', 'En', 'Ja']) row[`${field}${suffix}`] = 'text';
      }
      writeFileSync(join(root, folder, `raw-${kind}.json`), JSON.stringify([row]));
    }
  }
  writeFileSync(join(root, 'notes.txt'), 'original');
  git('add', '.'); git('commit', '-m', 'fixture');
  const dataDir = resolve(directory, 'data');
  store = openStore(join(dataDir, 'workbench.sqlite'));
  const evidence = store.importEvidence({ gameId: 'hi3', title: '公告', sourceType: 'official_claim', server: '国服', language: 'zh', body: '角色A装备B', url: 'https://example.com' }).evidence;
  const fact = store.createFact({ evidenceId: evidence.id, entity: '角色A', field: '装备', value: 'B', quote: evidence.body, server: '国服', lifecycle: 'live', validFrom: '', validUntil: '' }).fact;
  store.reviewFact({ factId: fact.id, expectedRevision: 0, decision: 'confirmed', reviewer: 'test', note: 'checked', sourceChecked: true, scopeChecked: true, valueChecked: true });
  const context = () => ({ index: scanContent(root), baseline: baseline(root) });
  const batch = store.createBatch(evidence.id, (item, facts) => buildBatch(item, context().index, context().baseline, facts)).batch;
  const revision = () => store.createRevision({ batchId: batch.id, selectedFacts: [{ id: fact.id, revision: 1 }],
    expectedLatest: store.revisions().length, requestId: randomUUID(), note: 'draft input' }, context()).revision;
  return { root, dataDir, store, git, revision, fact, service: workspaceService(root, dataDir, store) };
}

test('clean detached worktree excludes unrelated dirty changes, persists and retries without overwriting', (t) => {
  const { root, store, service, revision, git } = fixture(t);
  writeFileSync(join(root, 'notes.txt'), 'user changes');
  const record = revision();
  const workspace = service.create(record.id);
  assert.equal(workspace.status, 'ready');
  assert.equal(workspace.inspection.status, 'ready_for_manual_draft');
  assert.equal(readFileSync(join(workspace.path, 'notes.txt'), 'utf8'), 'original');
  assert.equal(readFileSync(join(root, 'notes.txt'), 'utf8'), 'user changes');
  assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: workspace.path, encoding: 'utf8' }).trim(), workspace.baselineCommit);
  assert.equal(service.create(record.id).id, workspace.id);
  assert.equal(store.workspaces().length, 1);
  assert.equal(git('status', '--porcelain').trim(), 'M notes.txt');
  const file = 'packages/data/games/hi3/raw-characters.json';
  writeFileSync(join(workspace.path, file), '[]');
  const report = service.list()[0];
  assert.equal(report.inspection.changes[0].allowed, true);
  assert.ok(report.inspection.diff.includes('-['));
  assert.equal(report.inspection.capabilities.publish, false);
  assert.equal(service.create(record.id).id, workspace.id);
  assert.equal(readFileSync(join(workspace.path, file), 'utf8'), '[]');
  const validation = service.validate(workspace.id);
  assert.equal(validation.assessment.status, 'current');
  assert.equal(store.validations().length, 1);
  const extra = join(workspace.path, 'packages/data/games/hi3/raw-new.json');
  writeFileSync(extra, '[]');
  assert.equal(service.reports()[0].assessment.status, 'stale');
  const updated = service.validate(workspace.id);
  assert.equal(updated.assessment.status, 'current');
  writeFileSync(extra, '[{"id":"changed"}]');
  assert.equal(service.reports()[0].assessment.status, 'stale');
  const persisted = store.validations();
  assert.equal(persisted.length, 2);
  assert.equal(persisted[1].inputFingerprint, validation.inputFingerprint);
});

function reviewInput(packet, patch = {}) {
  return { workspaceId: packet.workspaceId, validationId: packet.validation.id, packetDigest: packet.digest,
    requestId: randomUUID(), expectedLatest: 0, decision: 'accepted', reviewer: 'test', note: '核对精确差异，未覆盖项留待后续验证',
    acknowledgedRules: uncoveredRules(packet.validation), diffChecked: true, factsChecked: true, noPublishUnderstood: true, ...patch };
}
function editMirrors(workspace, value) {
  for (const folder of ['packages/data/games/hi3', 'apps/web/public/data/hi3']) {
    const path = join(workspace.path, folder, 'raw-characters.json');
    const rows = JSON.parse(readFileSync(path, 'utf8')); rows[0].description = value;
    writeFileSync(path, JSON.stringify(rows));
  }
}

test('reconfirming a selected fact invalidates validation, accepted review and preview without rewriting history', (t) => {
  const { service, revision, store, fact } = fixture(t);
  const record = revision();
  const workspace = service.create(record.id);
  editMirrors(workspace, 'reviewed text');
  const validation = service.validate(workspace.id);
  const packet = service.reviewPacket(workspace.id, validation.id);
  const request = reviewInput(packet);
  const accepted = service.reviewDraft(request).review;
  const preview = service.previewDraft(accepted.id).preview;
  store.reviewFact({ factId: fact.id, expectedRevision: 1, decision: 'confirmed', reviewer: 'test', note: 'checked again',
    sourceChecked: true, scopeChecked: true, valueChecked: true });
  assert.ok(store.getRevision(record.id).invalidatedAt);
  assert.equal(store.getRevision(record.id).snapshotDigest, record.snapshotDigest);
  assert.equal(service.reports()[0].assessment.status, 'stale');
  assert.equal(service.draftReviews()[0].assessment.status, 'stale');
  assert.equal(service.dataPreviews()[0].assessment.status, 'stale');
  assert.throws(() => service.reviewPacket(workspace.id, validation.id), (error) => error.status === 409);
  assert.throws(() => service.acceptedReview(accepted.id), (error) => error.status === 409);
  assert.throws(() => service.previewDraft(accepted.id), (error) => error.status === 409);
  const replay = service.reviewDraft(request);
  assert.equal(replay.duplicate, true);
  assert.equal(replay.review.assessment.status, 'stale');
  assert.equal(store.draftReviews().length, 1);
  assert.equal(store.draftReviews()[0].packetDigest, packet.digest);
  assert.equal(store.dataPreviews()[0].id, preview.id);
});

test('oversized allowed-path JSON blocks workspace inspection before validation or review', (t) => {
  const { service, revision } = fixture(t);
  const workspace = service.create(revision().id);
  const path = join(workspace.path, 'packages/data/games/hi3/raw-characters.json');
  writeFileSync(path, '["' + 'x'.repeat(4 * 1024 * 1024) + '"]');
  const inspected = service.list()[0];
  assert.equal(inspected.inspection.status, 'blocked');
  assert.equal(inspected.inspection.changes.find((item) => item.path.endsWith('raw-characters.json')).allowed, false);
  assert.throws(() => service.validate(workspace.id), (error) => error.status === 409);
});

test('draft review binds exact packet, checks gaps, rejects stale pages and preserves history', (t) => {
  const { service, revision, store, dataDir, root } = fixture(t);
  const workspace = service.create(revision().id);
  editMirrors(workspace, 'reviewed text');
  const report = service.validate(workspace.id);
  assert.equal(report.summary.failed, 0);
  const packet = service.reviewPacket(workspace.id, report.id);
  assert.equal(packet.contents.length, 2);
  assert.ok(packet.contents[0].content.includes('reviewed text'));
  for (const patch of [{ acknowledgedRules: [] }, { diffChecked: false }, { packetDigest: 'wrong' }]) {
    assert.throws(() => service.reviewDraft(reviewInput(packet, patch)));
  }
  const request = reviewInput(packet);
  const accepted = service.reviewDraft(request);
  assert.equal(accepted.review.assessment.status, 'current');
  const preview = service.previewDraft(accepted.review.id);
  assert.equal(preview.preview.pages.length, 3);
  assert.equal(service.previewDraft(accepted.review.id).duplicate, true);
  assert.equal(service.reviewDraft(request).duplicate, true);
  assert.throws(() => service.reviewDraft({ ...request, note: 'changed' }), (error) => error.status === 409);
  assert.throws(() => service.reviewDraft(reviewInput(packet)), (error) => error.status === 409);
  service.reviewDraft(reviewInput(packet, { expectedLatest: 1, decision: 'rejected' }));
  assert.equal(service.draftReviews()[1].assessment.status, 'stale');
  editMirrors(workspace, 'changed after review');
  assert.equal(service.draftReviews()[0].assessment.status, 'stale');
  assert.equal(service.dataPreviews()[0].assessment.status, 'stale');
  assert.throws(() => service.previewDraft(accepted.review.id), (error) => error.status === 409);
  assert.throws(() => service.reviewDraft(reviewInput(packet, { expectedLatest: 2 })), (error) => error.status === 409);
  assert.equal(service.reviewDraft(request).review.assessment.status, 'stale');
  assert.equal(store.draftReviews().length, 2);
  const reopened = openStore(join(dataDir, 'workbench.sqlite'));
  assert.equal(reopened.draftReviews()[1].snapshot.digest, packet.digest);
  assert.equal(workspaceService(root, dataDir, reopened).draftReviews()[0].assessment.status, 'stale');
  assert.equal(reopened.dataPreviews().length, 1);
  reopened.close();
});

test('empty or failed drafts cannot be accepted; rejected drafts remain traceable', (t) => {
  const { service, revision } = fixture(t);
  const workspace = service.create(revision().id);
  let report = service.validate(workspace.id);
  let packet = service.reviewPacket(workspace.id, report.id);
  assert.throws(() => service.reviewDraft(reviewInput(packet)));
  writeFileSync(join(workspace.path, 'packages/data/games/hi3/raw-weapons.json'), '[]');
  report = service.validate(workspace.id); packet = service.reviewPacket(workspace.id, report.id);
  assert.ok(report.summary.failed > 0);
  assert.throws(() => service.reviewDraft(reviewInput(packet)));
  assert.equal(service.reviewDraft(reviewInput(packet, { decision: 'rejected' })).review.decision, 'rejected');
});

test('untracked additions and deletions are included in exact review material', (t) => {
  const { service, revision } = fixture(t);
  const workspace = service.create(revision().id);
  for (const folder of ['packages/data/games/hi3', 'apps/web/public/data/hi3']) {
    writeFileSync(join(workspace.path, folder, 'raw-extra.json'), '[{"id":"new-record"}]');
    rmSync(join(workspace.path, folder, 'raw-stigma-sets.json'));
  }
  const report = service.validate(workspace.id);
  const packet = service.reviewPacket(workspace.id, report.id);
  assert.equal(packet.contents.filter((file) => file.deleted).length, 2);
  assert.equal(packet.contents.filter((file) => file.content?.includes('new-record')).length, 2);
  assert.ok(packet.manifest.changes.some((file) => file.untracked));
});

test('HTTP draft review packet and export enforce auth and recheck exact file input', async (t) => {
  const { root, dataDir, service, revision, git } = fixture(t);
  writeFileSync(join(root, 'package.json'), '{"packageManager":"pnpm@10.10.0"}'); writeFileSync(join(root, 'pnpm-lock.yaml'), 'lock');
  writeFileSync(join(root, 'apps/web/.env.example'), 'SAMPLE=fixture');
  git('add', '.'); git('commit', '-m', 'source material fixture');
  const workspace = service.create(revision().id); editMirrors(workspace, 'HTTP review');
  const report = service.validate(workspace.id);
  // Server and fixture deliberately share one SQLite database.
  const app = await startWorkbench({ root, dataDir, port: 0 }); t.after(() => app.close());
  const headers = { Authorization: `Bearer ${app.token}`, Origin: app.origin, 'Content-Type': 'application/json' };
  assert.equal((await fetch(`${app.origin}/api/draft-reviews/missing`)).status, 401);
  assert.equal((await fetch(`${app.origin}/api/draft-reviews/missing`, { headers })).status, 404);
  const response = await fetch(`${app.origin}/api/draft-review-packet`, { method: 'POST', headers,
    body: JSON.stringify({ workspaceId: workspace.id, validationId: report.id }) });
  assert.equal(response.status, 200);
  const { packet } = await response.json();
  const request = reviewInput(packet);
  const accepted = await fetch(`${app.origin}/api/draft-reviews`, { method: 'POST', headers, body: JSON.stringify(request) });
  assert.equal(accepted.status, 201);
  const { review } = await accepted.json();
  const exclusionsUrl = `${app.origin}/api/execution-materials/exclusions`;
  const exclusionRequest = { method: 'POST', headers, body: JSON.stringify({ reviewId: review.id }) };
  assert.equal((await fetch(exclusionsUrl, { ...exclusionRequest, headers: { 'Content-Type': 'application/json' } })).status, 401);
  const proposed = await fetch(exclusionsUrl, exclusionRequest); assert.equal(proposed.status, 200);
  const { proposal } = await proposed.json();
  assert.equal(proposal.exclusions[0].path, 'apps/web/.env.example');
  const frozenResponse = await fetch(`${app.origin}/api/execution-materials`, { method: 'POST', headers,
    body: JSON.stringify({ reviewId: review.id, confirmSourceOnly: true, confirmExclusions: true, exclusionDigest: proposal.digest }) });
  assert.equal(frozenResponse.status, 201);
  const { material } = await frozenResponse.json(); assert.equal(material.status, 'frozen_source_only');
  assert.equal(material.capabilities.execute, false);
  const planUrl = `${app.origin}/api/execution-materials/dependency-plans`;
  const planInput = { materialId: material.id, confirmPlanOnly: true, image: `registry.example.com/preview@sha256:${'c'.repeat(64)}`,
    platform: 'linux/arm64', nodeVersion: '22.18.0', pnpmVersion: '10.10.0', sourceUrl: 'https://example.com/source', note: 'Fixture metadata, not verified artifact' };
  const planRequest = { method: 'POST', headers, body: JSON.stringify(planInput) };
  assert.equal((await fetch(planUrl, { ...planRequest, headers: { 'Content-Type': 'application/json' } })).status, 401);
  const savedPlan = await fetch(planUrl, planRequest); assert.equal(savedPlan.status, 201);
  const { plan } = await savedPlan.json(); assert.equal(plan.status, 'planned_unverified');
  const contractUrl = `${app.origin}/api/execution-materials/preparation-contract`;
  const contractRequest = { method: 'POST', headers, body: JSON.stringify({ materialId: material.id, planId: plan.id }) };
  assert.equal((await fetch(contractUrl, { ...contractRequest, headers: { 'Content-Type': 'application/json' } })).status, 401);
  const contractResponse = await fetch(contractUrl, contractRequest); assert.equal(contractResponse.status, 200);
  const { contract } = await contractResponse.json(); assert.equal(contract.readiness.status, 'blocked_unverified');
  assert.equal(contract.capabilities.execute, false);
  const stagingUrl = `${app.origin}/api/execution-materials/staging-contract`;
  assert.equal((await fetch(stagingUrl, { ...contractRequest, headers: { 'Content-Type': 'application/json' } })).status, 401);
  const stagingResponse = await fetch(stagingUrl, contractRequest); assert.equal(stagingResponse.status, 200);
  assert.equal((await stagingResponse.json()).contract.capabilities.mount, false);
  assert.equal((await fetch(planUrl, planRequest)).status, 200);
  const previewResponse = await fetch(`${app.origin}/api/data-previews`, { method: 'POST', headers,
    body: JSON.stringify({ reviewId: review.id, confirmDataOnly: true }) });
  assert.equal(previewResponse.status, 201);
  const { preview } = await previewResponse.json();
  assert.equal(preview.summary.browserExecuted, false);
  editMirrors(workspace, 'changed after HTTP review');
  assert.equal((await fetch(exclusionsUrl, exclusionRequest)).status, 409);
  assert.equal((await fetch(planUrl, planRequest)).status, 409);
  assert.equal((await fetch(contractUrl, contractRequest)).status, 409);
  assert.equal((await fetch(stagingUrl, contractRequest)).status, 409);
  const exported = await (await fetch(`${app.origin}/api/draft-reviews/${review.id}`, { headers })).json();
  assert.equal(exported.review.assessment.status, 'stale');
  assert.equal(exported.review.capabilities.publish, false);
  const previewExport = await (await fetch(`${app.origin}/api/data-previews/${preview.id}`, { headers })).json();
  assert.equal(previewExport.preview.assessment.status, 'stale');
});

test('desktop and mobile browsers load exact material, accept a draft and show stale review after edits', { skip: process.env.WORKBENCH_BROWSER_TESTS !== '1' }, async (t) => {
  const { chromium } = await import('@playwright/test');
  const { root, dataDir, service, revision, git, store } = fixture(t);
  writeFileSync(join(root, 'package.json'), '{"packageManager":"pnpm@10.10.0"}'); writeFileSync(join(root, 'pnpm-lock.yaml'), 'lock');
  writeFileSync(join(root, 'apps/web/.env.example'), 'SAMPLE=fixture');
  git('add', '.'); git('commit', '-m', 'browser source material fixture');
  const workspace = service.create(revision().id); editMirrors(workspace, 'browser review');
  service.validate(workspace.id);
  const app = await startWorkbench({ root, dataDir, port: 0 }); t.after(() => app.close());
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close());
  const inspectionIntent = store.executionIntents.reserve({ requestId: 'browser-inspection', materialId: 'fixture-material', planId: 'fixture-plan',
    planDigest: 'a'.repeat(64), ownerInstanceId: 'browser-fixture', ownerNonce: 'b'.repeat(64), leaseMs: 60000 }).intent;
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    await page.goto(`${app.origin}/#token=${app.token}`);
    await page.getByRole('status').filter({ hasText: '本机已连接' }).waitFor();
    const launchDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出执行预算与启动协议（不执行）' }).click();
    const launchFile = await launchDownload;
    const launchProtocol = JSON.parse(readFileSync(await launchFile.path(), 'utf8'));
    assert.equal(launchProtocol.capabilities.create, false); assert.equal(launchProtocol.effectiveLimits, null);
    await page.locator('.isolation-integration > summary').click();
    const gapDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出隔离接入缺口报告' }).click();
    const gapFile = await gapDownload;
    const gaps = JSON.parse(readFileSync(await gapFile.path(), 'utf8'));
    assert.equal(gaps.status, 'blocked_not_integrated'); assert.equal(gaps.capabilities.connect, false);
    await page.locator('#execution-policy .execution-intents > summary').click();
    const inspectionDownload = page.waitForEvent('download');
    await page.getByRole('button', { name: `导出停止前核验规范 · ${inspectionIntent.id}` }).click();
    const inspectionFile = await inspectionDownload;
    const inspectionContract = JSON.parse(readFileSync(await inspectionFile.path(), 'utf8'));
    assert.equal(inspectionContract.capabilities.stop, false);
    assert.equal(inspectionContract.expected.instanceId, null);
    await page.locator('.validation-report > summary').first().click();
    await page.getByRole('button', { name: '加载草案审核材料' }).first().click();
    const form = page.locator('.draft-review-form'); await form.waitFor();
    await form.getByLabel('审核身份类型').selectOption('agent');
    await form.getByLabel('授权依据').fill('合成草案浏览器验收授权，非真实审批');
    await form.getByLabel('草案审核人（自报身份）').fill('浏览器测试');
    await form.getByLabel('草案审核理由').fill('仅验收审核流程');
    await form.getByLabel('草案审核决定').selectOption('accepted');
    for (const checkbox of await form.locator('input[type=checkbox]').all()) await checkbox.check();
    await form.getByRole('button', { name: '记录草案审核' }).click();
    await page.getByRole('status').filter({ hasText: '草案审核已记录' }).waitFor();
    assert.ok(await page.locator('.draft-review-history').getByText('接受（非发布批准）', { exact: false }).count() > 0);
    assert.ok(await page.locator('.draft-review-history').getByText('代理（自报）', { exact: false }).count() > 0);
    const history = page.locator('.draft-review-history').first();
    await history.locator(':scope > summary').click();
    await history.getByRole('button', { name: '生成数据级预览（不运行应用）' }).click();
    await page.getByRole('status').filter({ hasText: '已生成固定模板数据预览' }).waitFor();
    const newest = page.locator('.draft-review-history').first();
    await newest.locator(':scope > summary').click();
    const preview = newest.locator('.data-preview'); await preview.locator(':scope > summary').click();
    await preview.getByRole('button', { name: '查看所选数据页' }).click();
    const frame = preview.frameLocator('iframe');
    await frame.getByRole('heading', { level: 1 }).waitFor();
    assert.equal(await frame.getByRole('heading', { level: 1 }).count(), 1);
    assert.ok(await frame.locator('article').innerText());
    const iframe = preview.locator('iframe'); assert.equal(await iframe.getAttribute('sandbox'), '');
    const countBefore = store.executionMaterials().length;
    page.once('dialog', (dialog) => dialog.dismiss());
    await newest.getByRole('button', { name: '检查环境模板排除清单后冻结（不执行）' }).click();
    await newest.locator('pre').filter({ hasText: 'source-exclusions-v1' }).waitFor();
    assert.equal(store.executionMaterials().length, countBefore);
    page.once('dialog', async (dialog) => {
      assert.ok(dialog.message().includes('apps/web/.env.example'));
      assert.ok(dialog.message().includes('SHA-256:'));
      await dialog.accept();
    });
    await newest.getByRole('button', { name: '检查环境模板排除清单后冻结（不执行）' }).click();
    await page.getByRole('status').filter({ hasText: '已按确认清单冻结源材料' }).waitFor();
    assert.equal(store.executionMaterials().length, countBefore + 1);
    assert.equal(store.executionMaterials().at(-1).status, 'frozen_source_only');
    const refreshedHistory = page.locator('.draft-review-history').first();
    await refreshedHistory.locator(':scope > summary').click();
    const materialDetails = refreshedHistory.locator('details').filter({ has: page.locator('.dependency-plan-form') }).first();
    await materialDetails.locator(':scope > summary').click();
    const planForm = materialDetails.locator('.dependency-plan-form');
    await planForm.getByLabel('完整镜像摘要').fill(`registry.example.com/preview@sha256:${'d'.repeat(64)}`);
    await planForm.getByLabel('Linux目标平台').fill('linux/arm64');
    await planForm.getByLabel('精确Node版本').fill('22.18.0');
    await planForm.getByLabel('精确pnpm版本').fill('10.10.0');
    await planForm.getByLabel('镜像来源说明链接').fill('https://example.com/source');
    await planForm.getByLabel('身份计划说明').fill('Browser fixture; no real artifact verified');
    await planForm.getByLabel('确认仅记录未验证计划，不下载镜像或执行代码').check();
    await planForm.getByRole('button', { name: '记录未验证依赖计划' }).click();
    await page.getByRole('status').filter({ hasText: '已记录未验证依赖计划' }).waitFor();
    assert.ok(store.executionMaterials().some((item) => item.dependencyPlans?.some((plan) => plan.status === 'planned_unverified' && !plan.capabilities.execute)));
    const exportHistory = page.locator('.draft-review-history').first();
    await exportHistory.locator(':scope > summary').click();
    const readyMaterial = exportHistory.locator('details').filter({ has: page.locator('.preparation-readiness') }).first();
    await readyMaterial.locator(':scope > summary').click();
    assert.ok((await readyMaterial.locator('.preparation-readiness').first().innerText()).includes('blocked_unverified'));
    const downloadPromise = page.waitForEvent('download');
    await readyMaterial.getByRole('button', { name: '导出准备器契约（不执行）' }).first().click();
    const downloaded = await downloadPromise;
    assert.match(downloaded.suggestedFilename(), /^dependency-preparation-contract-.*\.json$/);
    const exportedContract = JSON.parse(readFileSync(await downloaded.path(), 'utf8'));
    assert.equal(exportedContract.capabilities.prepare, false);
    assert.equal(exportedContract.readiness.status, 'blocked_unverified');
    const stagingDownload = page.waitForEvent('download');
    await readyMaterial.getByRole('button', { name: '导出staging挂载契约（不复制）' }).first().click();
    const stagingFile = await stagingDownload;
    const stagingContract = JSON.parse(readFileSync(await stagingFile.path(), 'utf8'));
    assert.equal(stagingContract.capabilities.mount, false); assert.equal(stagingContract.staging.createdNow, false);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.close();
  }
  editMirrors(workspace, 'changed after browser review');
  const page = await browser.newPage(); await page.goto(`${app.origin}/#token=${app.token}`);
  await page.getByRole('status').filter({ hasText: '本机已连接' }).waitFor();
  assert.ok(await page.locator('.draft-review-history').getByText('已过期', { exact: false }).count() > 0);
  await page.close();
});

test('relevant uncommitted content and revoked input block workspace creation', (t) => {
  const { root, service, revision, store, fact } = fixture(t);
  writeFileSync(join(root, 'packages/data/games/hi3/raw-characters.json'), '[]');
  writeFileSync(join(root, 'apps/web/public/data/hi3/raw-characters.json'), '[]');
  assert.throws(() => service.create(revision().id), (error) => error.status === 409);
  store.reviewFact({ factId: fact.id, expectedRevision: 1, decision: 'rejected', reviewer: 'test', note: 'wrong' });
  assert.equal(store.workspaces().length, 0);
});

test('out-of-scope, symlink, invalid JSON and revoked facts block inspection', (t) => {
  const { service, revision, store, fact } = fixture(t);
  const workspace = service.create(revision().id);
  writeFileSync(join(workspace.path, 'package.json'), '{}');
  assert.equal(service.list()[0].inspection.status, 'blocked');
  rmSync(join(workspace.path, 'package.json'));
  const dataPath = join(workspace.path, 'packages/data/games/hi3/raw-characters.json');
  writeFileSync(dataPath, 'broken');
  assert.equal(service.list()[0].inspection.changes[0].allowed, false);
  rmSync(dataPath); symlinkSync('/etc/hosts', dataPath);
  assert.equal(service.list()[0].inspection.status, 'blocked');
  store.reviewFact({ factId: fact.id, expectedRevision: 1, decision: 'needs_review', reviewer: 'test', note: 'recheck' });
  assert.ok(service.list()[0].inspection.reasons.some((reason) => reason.includes('永久失效')));
});

test('large ignored dependency listings are excluded before output budgeting without hiding other ignored files', (t) => {
  const { root, service, revision } = fixture(t);
  const workspace = service.create(revision().id);
  writeFileSync(join(root, '.git/info/exclude'), 'node_modules/\n.next/\nprivate.tmp\n');
  const directories = ['node_modules', 'apps/web/node_modules', 'apps/web/.next', 'packages/data/node_modules'];
  for (const directory of directories) {
    mkdirSync(join(workspace.path, directory), { recursive: true });
    for (let i = 0; i < 2250; i++) writeFileSync(join(workspace.path, directory, `${'x'.repeat(230)}-${i}`), '');
  }
  assert.equal(service.list()[0].inspection.status, 'ready_for_manual_draft');
  writeFileSync(join(workspace.path, 'private.tmp'), 'must remain visible');
  const inspection = service.list()[0].inspection;
  assert.equal(inspection.status, 'blocked');
  assert.ok(inspection.changes.some((change) => change.path === 'private.tmp' && change.ignored && !change.allowed));
});

test('ignored out-of-scope files, checkout filters and changed HEAD are blocked', (t) => {
  const { service, revision, git } = fixture(t);
  const record = revision();
  git('config', 'filter.unsafe.smudge', 'echo unsafe');
  assert.throws(() => service.create(record.id), (error) => error.status === 409);
  git('config', '--unset', 'filter.unsafe.smudge');
  const workspace = service.create(record.id);
  const workGit = (...args) => execFileSync('git', args, { cwd: workspace.path, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const exclude = workGit('rev-parse', '--git-path', 'info/exclude').trim();
  writeFileSync(resolve(workspace.path, exclude), 'private.tmp\n');
  writeFileSync(join(workspace.path, 'private.tmp'), 'ignored');
  assert.ok(service.list()[0].inspection.changes.some((change) => change.ignored && !change.allowed));
  rmSync(join(workspace.path, 'private.tmp'));
  workGit('-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '--allow-empty', '-m', 'changed head');
  assert.ok(service.list()[0].inspection.reasons.some((reason) => reason.includes('HEAD')));
});
