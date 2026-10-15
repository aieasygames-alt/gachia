import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync, readdirSync, realpathSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { randomUUID } from 'node:crypto';
import { FactError } from './facts.mjs';
import { affectedPages } from './affected-pages.mjs';
import { fetchDiscovery } from './discovery-checks.mjs';
import { checkSearchInteractions, checkSearchEmptyAndClose } from './search-interactions.mjs';
import { executionMode } from './execution-policy.mjs';

const activeStates = ['starting', 'running', 'checking', 'stopping'];
export function previewPaths(review) {
  return affectedPages(review).pages.map((page) => page.path);
}
export function applicationPreviewService(store, workspaces, { launch = spawn, maxDurationMs = 10 * 60 * 1000, watchMs = 5000,
  signalGroup = (pid, signal) => process.kill(-pid, signal), killGraceMs = 3000, exitWaitMs = 1000 } = {}) {
  if (!Number.isInteger(killGraceMs) || killGraceMs < 1 || killGraceMs > 3000 ||
    !Number.isInteger(exitWaitMs) || exitWaitMs < 1 || exitWaitMs > 1000 || typeof signalGroup !== 'function' ||
    !Number.isInteger(maxDurationMs) || maxDurationMs < 1 || maxDurationMs > 600000 ||
    !Number.isInteger(watchMs) || watchMs < 1 || watchMs > 5000) throw new Error('Invalid internal preview lifecycle policy');
  const active = new Map();
  const ownerInstanceId = randomUUID();
  const pendingFinalStates = new Map();
  function retryFinalStates() {
    for (const [id, record] of pendingFinalStates) {
      try { save(record); pendingFinalStates.delete(id); } catch { /* Keep the execution fence until storage recovers. */ }
    }
  }
  let closed = false;
  for (const record of store.applicationPreviews()) {
    if (!record.ownerInstanceId && activeStates.includes(record.status)) store.saveApplicationPreview({ ...record, status: 'needs_reconciliation',
      message: '上次进程结果未知。请人工核对该路径的进程及端口；不会按旧 PID 自动杀进程或重复启动。' });
  }
  const save = (record) => record.ownerInstanceId ? store.updateOwnedApplicationPreview(record, ownerInstanceId) : store.saveApplicationPreview(record);
  function boundReview(record) {
    const review = workspaces.acceptedReview(record.reviewId);
    if (review.packetDigest !== record.packetDigest) throw new FactError('审核材料已变化', 409);
    return review;
  }
  function describe(record) {
    let valid = true;
    try { boundReview(record); } catch { valid = false; }
    const held = active.has(record.id);
    const pending = pendingFinalStates.has(record.id);
    const terminal = ['stopped', 'failed', 'exited', 'interrupted'].includes(record.status);
    const foreign = record.ownerInstanceId && record.ownerInstanceId !== ownerInstanceId;
    const reason = pending ? 'terminal_save_pending' : held ? 'this_instance_owned_process' : terminal ? 'saved_terminal_only' : foreign ? 'other_or_previous_instance_unknown' : 'legacy_or_unknown_saved_state';
    const messages = {
      terminal_save_pending: '已观察到进程终态，但保存失败；阻止新启动，存储恢复后仅重试保存。',
      this_instance_owned_process: '本实例仍持有该进程；停止请求或信号成功不代表退出已确认。',
      saved_terminal_only: '已保存终态；不表示已检查进程组后代、外部端口或其他数据库。',
      other_or_previous_instance_unknown: '其他或历史实例记录；未探测所属实例活性、进程或端口，不能据此判断已退出。',
      legacy_or_unknown_saved_state: '旧版或未知状态记录保持阻断；仅旧版待对账记录可按既有明确确认流程处理。',
    };
    return { ...record, occupancy: { reason, message: messages[reason], blocksStart: held || pending || !terminal,
      scope: 'saved_state_and_this_service_memory_not_external_process_inspection',
      actions: { check: held && ['starting', 'running'].includes(record.status), stop: held && !pending,
        reconcile: !held && !pending && !record.ownerInstanceId && record.status === 'needs_reconciliation', unlock: false, takeover: false } },
      ownership: record.ownerInstanceId ? (record.ownerInstanceId === ownerInstanceId ? 'this_instance' : 'other_or_previous_instance_not_inspected') : 'legacy_unowned',
      assessment: { status: valid ? 'current' : 'stale', publish: false },
      // Live stdout can contain arbitrary application secrets. Never persist or expose it.
      limits: { lifetimeMs: maxDurationMs, nodeHeapMiB: 1024, concurrency: 1 },
      capabilities: { commit: false, publish: false } };
  }
  function preflight(reviewId) {
    const review = workspaces.acceptedReview(reviewId);
    const workspace = store.workspaces().find((item) => item.id === review.workspaceId);
    if (!workspace) throw new FactError('Workspace not found', 404);
    const root = realpathSync(workspace.path);
    const cwd = join(root, 'apps/web');
    if (!existsSync(cwd) || realpathSync(cwd) !== cwd) throw new FactError('应用目录不存在或为符号链接', 409);
    for (const directory of [root, cwd]) {
      if (readdirSync(directory).some((name) => /^\.env(?:\.|$)/.test(name) && !/\.(example|sample|template)$/.test(name))) {
        throw new FactError('预览目录包含 .env 文件，启动被拒绝；请使用不含凭据的独立工作区', 409);
      }
    }
    const cli = join(cwd, 'node_modules/next/dist/bin/next');
    if (!existsSync(cli)) throw new FactError('独立工作区缺少 Next.js 依赖。请先在外部审核并准备依赖；工作台不会安装或链接主目录依赖。', 409);
    const resolved = realpathSync(cli);
    if (relative(root, resolved).startsWith('..')) throw new FactError('Next.js 依赖指向工作区外部，拒绝共享主目录依赖', 409);
    return { review, workspace, cwd, cli: resolved };
  }
  async function start(input) {
    if (closed) throw new FactError('Preview service stopped', 409);
    let mode;
    try { mode = executionMode(input); } catch (error) { throw new FactError(error.message, 409); }
    if (typeof input?.reviewId !== 'string' || input.confirmExecuteCode !== true || input.confirmNotSandboxed !== true) {
      throw new FactError('必须明确确认运行草案代码及非沙箱风险');
    }
    if (active.size || pendingFinalStates.size || store.applicationPreviews().some((item) => item.status === 'needs_reconciliation')) throw new FactError('已有预览运行或终态待保存/人工对账；禁止并发启动', 409);
    const { review, workspace, cwd, cli } = preflight(input.reviewId);
    const record = { id: randomUUID(), reviewId: review.id, workspaceId: workspace.id, workspacePath: workspace.path,
      packetDigest: review.packetDigest, ownerInstanceId, status: 'starting', createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + maxDurationMs).toISOString(), checks: [], origin: null, pid: null,
      mode: 'next_dev_local_code_execution', executionMode: mode, sandboxed: false, result: 'not_checked' };
    if (typeof store.reserveApplicationPreview !== 'function' || typeof store.updateOwnedApplicationPreview !== 'function') throw new FactError('预览存储缺少原子启动预留或归属更新，拒绝执行', 409);
    store.reserveApplicationPreview(record);
    active.set(record.id, { record, child: null, checking: false });
    try {
      const port = await new Promise((resolve, reject) => {
        const server = createServer(); server.once('error', reject);
        server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)); });
      });
      if (closed || record.status !== 'starting') throw new Error('Cancelled');
      boundReview(record);
      const current = preflight(input.reviewId);
      if (current.workspace.id !== workspace.id || current.cwd !== cwd || current.cli !== cli) throw new Error('Preview inputs changed');
      record.origin = `http://127.0.0.1:${port}`;
      const buildDirectory = join(cwd, '.next');
      if (existsSync(buildDirectory) && realpathSync(buildDirectory) !== buildDirectory) throw new Error('Linked preview output rejected');
      const home = join(buildDirectory, 'workbench-home');
      if (existsSync(home) && realpathSync(home) !== home) throw new Error('Linked preview home rejected');
      mkdirSync(home, { recursive: true, mode: 0o700 });
      if (realpathSync(home) !== home) throw new Error('Preview home changed');
      const child = launch(process.execPath, ['--max-old-space-size=1024', cli, 'dev', '--hostname', '127.0.0.1', '--port', String(port)], {
        cwd, shell: false, detached: true, stdio: ['ignore', 'ignore', 'ignore'],
        env: { PATH: '/usr/bin:/bin', HOME: home, TMPDIR: home, NODE_ENV: 'development', NEXT_TELEMETRY_DISABLED: '1',
          LANG: 'en_US.UTF-8', TZ: 'Asia/Shanghai' },
      });
      const entry = active.get(record.id); entry.child = child;
      record.pid = child.pid ?? null;
      child.once('error', () => finish(record, 'failed', '应用进程启动失败；未保存应用输出。'));
      child.once('exit', (code) => finish(record, entry.stopRequested ? 'stopped' : 'exited', `应用进程退出（${code ?? 'signal'}）。`));
      save(record);
      entry.timer = setTimeout(() => { try { stop(record.id, '达到预览最长运行时间'); } catch { /* Stop already attempted; retain owned state. */ } }, maxDurationMs); entry.timer.unref();
      return describe(record);
    } catch {
      const entry = active.get(record.id);
      if (entry?.child?.pid) {
        stop(record.id, '启动后状态保存失败，停止已创建的进程；停止完成前不释放运行槽。');
      } else {
        finish(record, 'failed', '预览未能启动，请核对依赖与本机端口。');
      }
      return describe(record);
    }
  }
  function finish(record, status, message) {
    const entry = active.get(record.id);
    if (!entry) return;
    clearTimeout(entry.timer); clearTimeout(entry.killTimer); clearTimeout(entry.exitTimer);
    active.delete(record.id);
    record.status = status; record.message = message; record.finishedAt = new Date().toISOString();
    try { save(record); } catch { pendingFinalStates.set(record.id, { ...record }); }
  }
  function stop(id, reason = '用户停止预览') {
    const entry = active.get(id);
    if (!entry) throw new FactError('该进程不属于当前服务；请人工对账，不会按旧 PID 终止', 409);
    const { record, child } = entry;
    entry.stopRequested = true;
    record.status = 'stopping'; record.message = reason;
    let saveError;
    try { save(record); } catch (error) { saveError = error; }
    entry.browser?.close().catch(() => {});
    if (!child?.pid) { finish(record, 'stopped', reason); return describe(record); }
    const signal = (name) => {
      try { if (signalGroup(child.pid, name) !== false) return true; } catch { /* Try only the child owned by this service. */ }
      try { return child.kill(name) !== false; } catch { return false; }
    };
    if (!signal('SIGTERM')) {
      record.stopSignalStatus = 'term_failed_exit_unknown';
      record.message = '停止信号发送失败，进程退出尚未确认；运行槽保持占用。';
      try { save(record); } catch (error) { saveError ??= error; }
    }
    clearTimeout(entry.killTimer); clearTimeout(entry.exitTimer);
    entry.killTimer = setTimeout(() => {
      // Only signal a process group while its originally spawned child is still alive.
      if (active.has(id) && child.exitCode === null && child.signalCode === null) {
        if (!signal('SIGKILL')) {
          record.status = 'needs_reconciliation'; record.stopSignalStatus = 'kill_failed_exit_unknown';
          record.message = '强制停止信号发送失败，退出未知；禁止新启动或自动释放，请核对本次进程。';
          try { save(record); } catch { /* Keep active ownership even when diagnostics cannot be saved. */ }
        } else {
          entry.exitTimer = setTimeout(() => {
            if (!active.has(id)) return;
            record.status = 'needs_reconciliation'; record.stopSignalStatus = 'signals_sent_exit_unconfirmed';
            record.message = '停止信号已发送但等待期限内未观察到退出；运行槽保持占用，不自动重启或释放。';
            try { save(record); } catch { /* Live ownership remains fenced. */ }
          }, exitWaitMs); entry.exitTimer.unref();
        }
      }
    }, killGraceMs); entry.killTimer.unref();
    if (saveError) throw saveError;
    return describe(record);
  }
  async function check(id) {
    const entry = active.get(id);
    if (!entry || entry.checking || !['starting', 'running'].includes(entry.record.status)) throw new FactError('预览未运行或已有检查', 409);
    const { record } = entry;
    const review = boundReview(record);
    const plan = affectedPages(review);
    const previous = { status: record.status, result: record.result };
    entry.checking = true; record.status = 'checking'; record.result = 'checking';
    try { save(record); }
    catch (error) { entry.checking = false; Object.assign(record, previous); throw error; }
    const checks = [];
    try {
      // Probe TCP readiness without triggering an expensive route compilation.
      const deadline = Date.now() + 30000;
      const { connect } = await import('node:net');
      while (true) {
        const ready = await new Promise((resolve) => {
          const socket = connect({ host: '127.0.0.1', port: Number(new URL(record.origin).port) });
          socket.setTimeout(500);
          const done = (value) => { socket.destroy(); resolve(value); };
          socket.once('connect', () => done(true)); socket.once('error', () => done(false)); socket.once('timeout', () => done(false));
        });
        if (ready) break;
        if (Date.now() >= deadline || record.status !== 'checking') throw new Error('Not ready');
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      const { chromium } = await import('@playwright/test');
      const browser = await chromium.launch({ headless: true }); entry.browser = browser;
      const context = await browser.newContext({ serviceWorkers: 'block' });
      const localOnly = (route) => {
        const url = new URL(route.request().url());
        return url.origin === record.origin && !url.pathname.startsWith('/api/') ? route.continue() : route.abort();
      };
      await context.route('**/*', localOnly);
      record.affectedPagePlan = plan;
      for (const target of plan.pages) {
        const { path } = target;
        boundReview(record);
        if (!active.has(id) || record.status !== 'checking') throw new Error('Stopped');
        const page = await context.newPage(); const errors = [];
        page.on('pageerror', () => errors.push('uncaught_page_error'));
        const response = await page.goto(`${record.origin}${path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        if (target.kind === 'deleted') {
          checks.push({ path, kind: 'deleted', status: response?.status() === 404 ? 'passed' : 'failed', httpStatus: response?.status(),
            note: '当前策略要求删除详情返回 404；归档或重定向需另行定义策略' });
          await page.close(); continue;
        }
        await page.locator('h1').first().waitFor({ timeout: 10000 });
        const title = await page.title();
        const h1 = await page.locator('h1').allTextContents();
        const bodyLength = (await page.locator('body').innerText()).trim().length;
        const language = await page.locator('html').getAttribute('lang');
        const canonical = await page.locator('link[rel=canonical]').first().getAttribute('href').catch(() => null);
        const locale = path.split('/')[1];
        const languageMatches = locale === 'zh' ? /^zh(?:-|$)/.test(language ?? '') : language === locale;
        const canonicalMatches = canonical === `https://gachia.com${path}`;
        const links = await page.locator('a[href]').evaluateAll((nodes) => nodes.map((node) => new URL(node.getAttribute('href'), location.href).pathname));
        const missingLinks = (target.expectedLinks ?? []).filter((link) => !links.includes(link));
        const lingeringLinks = (target.removedLinks ?? []).filter((link) => links.includes(link));
        let navigation = 'not_covered';
        if (target.kind === 'directory' && target.expectedLinks?.length) {
          const destination = target.expectedLinks[0];
          const link = page.locator('a[href]').filter({ visible: true });
          const handles = await link.all();
          for (const candidate of handles) {
            const href = await candidate.getAttribute('href');
            if (new URL(href, record.origin).pathname !== destination) continue;
            await candidate.click();
            await page.waitForURL(`${record.origin}${destination}`, { timeout: 15000 });
            await page.locator('h1').first().waitFor({ timeout: 10000 });
            navigation = 'passed'; break;
          }
          if (navigation !== 'passed') navigation = 'failed';
        }
        checks.push({ path, kind: target.kind, status: response?.status() === 200 && title.trim() && h1.length === 1 && h1[0].trim() && bodyLength > 80 && !errors.length && languageMatches && canonicalMatches && !missingLinks.length && !lingeringLinks.length && navigation !== 'failed' ? 'passed' : 'failed',
          httpStatus: response?.status(), titlePresent: Boolean(title.trim()), h1Count: h1.length, bodyLength, pageErrorCount: errors.length,
          observedLanguage: language, observedCanonical: canonical, languageMatches, canonicalMatches,
          missingLinks, lingeringLinks, directoryNavigation: navigation });
        await page.close();
      }
      boundReview(record);
      record.discoveryChecks = (await fetchDiscovery(record.origin, plan, review)).filter((item) => item.ruleId !== 'search.ui_behavior');
      checks.push(...record.discoveryChecks);
      record.searchInteractionChecks = await checkSearchInteractions(context, record.origin, plan, review, () => {
        boundReview(record);
        if (!active.has(id) || record.status !== 'checking') throw new Error('Stopped');
      });
      checks.push(...record.searchInteractionChecks);
      const currentSearch = () => {
        boundReview(record);
        if (!active.has(id) || record.status !== 'checking') throw new Error('Stopped');
      };
      const hasSearchChanges = plan.changes.some((item) => ['characters', 'weapons', 'materials'].includes(item.dataset)) && !record.discoveryChecks.some((item) => item.ruleId === 'search.fetch' && item.status === 'failed');
      if (!hasSearchChanges && plan.changes.some((item) => ['characters', 'weapons', 'materials'].includes(item.dataset))) {
        checks.push({ ruleId: 'search.ui_empty_close', status: 'not_covered', message: '搜索索引请求失败，跳过无结果交互；整体索引失败仍阻止通过' });
      }
      const desktopEmptyChecks = hasSearchChanges ? await checkSearchEmptyAndClose(context, record.origin, currentSearch) : [];
      record.searchInteractionChecks.push(...desktopEmptyChecks); checks.push(...desktopEmptyChecks);
      const keyboardChecks = hasSearchChanges ? await checkSearchInteractions(context, record.origin, plan, review, currentSearch, 'desktop', true) : [];
      record.searchInteractionChecks.push(...keyboardChecks); checks.push(...keyboardChecks);
      const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, serviceWorkers: 'block' });
      try {
        await mobile.route('**/*', localOnly);
        const mobileChecks = await checkSearchInteractions(mobile, record.origin, plan, review, () => {
          boundReview(record);
          if (!active.has(id) || record.status !== 'checking') throw new Error('Stopped');
        }, 'mobile');
        record.searchInteractionChecks.push(...mobileChecks);
        checks.push(...mobileChecks);
        const mobileEmptyChecks = hasSearchChanges ? await checkSearchEmptyAndClose(mobile, record.origin, currentSearch, 'mobile') : [];
        record.searchInteractionChecks.push(...mobileEmptyChecks); checks.push(...mobileEmptyChecks);
        const mobileKeyboard = hasSearchChanges ? await checkSearchInteractions(mobile, record.origin, plan, review, currentSearch, 'mobile', true) : [];
        record.searchInteractionChecks.push(...mobileKeyboard); checks.push(...mobileKeyboard);
      } finally { await mobile.close(); }
      boundReview(record);
      record.result = checks.some((item) => item.status === 'failed') ? 'failed' : 'partial_pass';
    } catch { record.result = 'failed'; record.message = '页面检查未完成；应用可能尚未就绪、缺少浏览器或审核已变化。'; }
    finally {
      await entry.browser?.close().catch(() => {}); entry.browser = null;
      entry.checking = false;
      if (active.has(id) && record.status === 'checking') record.status = 'running';
      record.checks = checks; record.checkedAt = new Date().toISOString();
      record.notCovered = ['非受影响页面', ...plan.notCovered.map((item) => `${item.path}: ${item.reason}`), ...checks.filter((item) => item.status === 'not_covered').map((item) => item.message), '翻译与事实语义', '外部资源', '筛选/复制等交互', '生产构建', 'Worker 包体', '线上版本'];
      save(record);
    }
    return describe(record);
  }
  const watcher = setInterval(() => {
    retryFinalStates();
    for (const [id, entry] of active) {
      if (entry.stopRequested) continue;
      try { boundReview(entry.record); } catch {
        try { stop(id, '草案审核或内容变化，自动停止'); } catch { /* Retain ownership on storage failure. */ }
      }
    }
  }, watchMs); watcher.unref();
  return { start, stop, check, list: () => {
    const records = new Map(store.applicationPreviews().map((record) => [record.id, record]));
    for (const [id, entry] of active) records.set(id, { ...entry.record });
    for (const [id, record] of pendingFinalStates) records.set(id, { ...record, status: 'needs_reconciliation',
      persistenceStatus: 'terminal_state_pending_save', observedTerminalStatus: record.status,
      message: '当前服务已观察到进程终态，但保存失败；新启动被阻断。存储恢复后重试保存，不重启应用。' });
    return [...records.values()].map(describe);
  },
    reconcile(input) {
      if (active.has(input?.id)) throw new FactError('当前服务仍持有进程，退出未知，不能人工覆盖运行槽', 409);
      if (pendingFinalStates.has(input?.id)) throw new FactError('进程终态待保存，不能用人工对账覆盖；请先恢复存储', 409);
      const record = store.applicationPreviews().find((item) => item.id === input?.id);
      if (record?.ownerInstanceId) throw new FactError('带实例归属的历史预览不能人工覆盖；退出归属尚未验证，禁止释放', 409);
      if (!record || record.status !== 'needs_reconciliation' || input.confirmProcessStopped !== true) throw new FactError('必须人工确认旧进程和端口已停止', 409);
      return save({ ...record, status: 'interrupted', message: '用户确认旧进程已停止；未执行 PID 终止。' });
    },
    async close() {
      closed = true; clearInterval(watcher);
      for (const id of active.keys()) { try { stop(id, '工作台关闭'); } catch { /* Continue stopping other owned processes. */ } }
      const deadline = Date.now() + 5000;
      while (active.size && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 50));
      for (const { record } of active.values()) {
        try { save({ ...record, status: 'needs_reconciliation', message: '停止结果未知，请人工核对。' }); } catch { /* Persisted active state reconciles on next startup. */ }
      }
      retryFinalStates();
    },
  };
}
