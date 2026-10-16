import { createServer } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openStore } from './store.mjs';
import { validateEvidence, scanContent, baseline, buildBatch } from './content.mjs';
import { FactError } from './facts.mjs';
import { assessRevision } from './revisions.mjs';
import { workspaceService } from './workspaces.mjs';
import { applicationPreviewService } from './application-preview.mjs';
import { sourceService, officialSource } from './official-source.mjs';
import { reviewPreparation } from './review-preparation.mjs';
import { executionPolicy } from './execution-policy.mjs';
import { executionMaterialService } from './execution-material.mjs';
import { executionLaunchProtocol } from './execution-protocol.mjs';
import { discoverMacRuntime } from './mac-runtime-discovery.mjs';
import { storageFiles } from './storage-files.mjs';
import { recoveryCoverage, compareStorage } from './storage-lifecycle.mjs';
import { releasePlan } from './release-plan.mjs';
import { buildCleanupPlan } from './cleanup-plan.mjs';
import { assessBatchClosure } from './batch-lifecycle.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repository = resolve(here, '../../..');
const assets = { '/': ['index.html', 'text/html; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'], '/style.css': ['style.css', 'text/css; charset=utf-8'] };

export async function startWorkbench({ root = repository, dataDir = join(root, '.gachia-workbench'), port = 4317 } = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid workbench port');
  const store = openStore(join(dataDir, 'workbench.sqlite'));
  let workspaces; let applicationPreviews; let sources; let executionMaterials;
  try {
    workspaces = workspaceService(root, dataDir, store);
    sources = sourceService(store);
    executionMaterials = executionMaterialService(dataDir, store, workspaces);
    applicationPreviews = applicationPreviewService(store, workspaces);
  } catch (error) {
    try { await applicationPreviews?.close(); } finally { store.close(); }
    throw error;
  }
  const token = randomBytes(32).toString('hex');
  let origin;
  let closing = false;
  let closePromise;
  let storageScanBusy = false;
  let previousStorageSnapshot = null;
  const authorized = (header) => {
    const candidate = Buffer.from(header ?? '');
    const expected = Buffer.from(`Bearer ${token}`);
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  };
  const server = createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    const send = (status, value) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(value));
    };
    if (closing) return send(503, { error: 'Workbench is closing' });
    try {
    if (req.headers.host !== new URL(origin).host) return send(403, { error: 'Invalid host' });
    if (req.headers.origin && req.headers.origin !== origin) return send(403, { error: 'Invalid origin' });
    if (req.headers['sec-fetch-site'] === 'cross-site') return send(403, { error: 'Cross-site requests are forbidden' });
    let requestUrl;
    try { requestUrl = new URL(req.url, origin); }
    catch { return send(400, { error: 'Invalid request URL' }); }
    if (requestUrl.origin !== origin) return send(403, { error: 'Invalid request target' });
    const path = requestUrl.pathname;
    if (req.method === 'GET' && Object.hasOwn(assets, path)) {
      const [file, contentType] = assets[path];
      res.writeHead(200, { 'Content-Type': contentType });
      return res.end(readFileSync(join(here, '../public', file)));
    }
    if (!path.startsWith('/api/')) return send(404, { error: 'Not found' });
    if (!authorized(req.headers.authorization)) return send(401, { error: 'Open the authenticated URL printed by the local server' });
      if (req.method === 'GET' && path === '/api/release-plan') return send(200, releasePlan(root));
      if (req.method === 'GET' && path === '/api/cleanup-plan') return send(200, buildCleanupPlan(store.cleanupSnapshot()));
      if (req.method === 'GET' && path === '/api/storage-health') {
        if (storageScanBusy) throw new FactError('容量扫描进行中，请稍后重试', 409);
        storageScanBusy = true;
        try {
          const snapshot = { ...store.storageHealth(), files: await storageFiles(dataDir) };
          const comparison = compareStorage(previousStorageSnapshot, snapshot);
          previousStorageSnapshot = snapshot;
          return send(200, { ...snapshot, comparison, recoveryCoverage,
          reconciliation: { scope: 'saved_status_only_not_external_inspection',
            source: store.sourceRecord(officialSource.id)?.status === 'needs_reconciliation' ? 1 : 0,
            applicationPreviews: store.applicationPreviews().filter((item) => item.status === 'needs_reconciliation').length,
            permissions: { retry: false, stop: false, release: false } } }); }
        finally { storageScanBusy = false; }
      }
      if (req.method === 'GET' && path === '/api/official-source/history') {
        const params = new URL(req.url, origin).searchParams;
        return send(200, store.sourceHistory(officialSource.id, { before: params.has('before') ? Number(params.get('before')) : undefined,
          query: params.get('query') ?? '', status: params.get('status') ?? '', from: params.get('from') ?? '', until: params.get('until') ?? '',
          limit: params.has('limit') ? Number(params.get('limit')) : 10 }));
      }
      if (req.method === 'GET' && path.startsWith('/api/official-source/history/')) return send(200, store.sourceHistoryRun(officialSource.id, Number(path.split('/').at(-1))));
      if (req.method === 'GET' && path === '/api/execution-launch-protocol') return send(200, { protocol: executionLaunchProtocol() });
      if (req.method === 'GET' && path === '/api/state') {
        const facts = store.facts(); const index = scanContent(root, facts); const git = baseline(root);
        return send(200, { gameId: 'hi3', sourceHealth: sources.state(), executionPolicy: executionPolicy(),
          index, baseline: git, evidence: store.evidence(), batches: store.batches(),
          batchLifecycles: Object.fromEntries(store.batches().map((batch) => [batch.id, assessBatchClosure(batch, facts, index, git)])),
          facts, reviewPreparations: store.evidence().map((item) => reviewPreparation(item, facts, store)).filter(Boolean),
          reviews: store.reviews(), events: store.events(),
          revisions: store.revisions().map((revision) => assessRevision(revision, facts, index, git)),
          workspaces: workspaces.list(), validations: workspaces.reports(), draftReviews: workspaces.draftReviews(),
          dataPreviews: workspaces.dataPreviews().map(({ pages, ...preview }) => ({ ...preview, pages: pages.map(({ html, ...page }) => page) })),
          applicationPreviews: applicationPreviews.list(), executionMaterials: executionMaterials.list(), executionIntents: store.executionIntents.list() });
      }
      if (req.method === 'GET' && path.startsWith('/api/draft-validations/')) {
        const report = workspaces.reports().find((item) => item.id === path.slice('/api/draft-validations/'.length));
        if (!report) return send(404, { error: 'Validation not found' });
        return send(200, { exportedAt: new Date().toISOString(), report });
      }
      if (req.method === 'GET' && path.startsWith('/api/draft-reviews/')) {
        const review = workspaces.draftReviews().find((item) => item.id === path.slice('/api/draft-reviews/'.length));
        if (!review) return send(404, { error: 'Review not found' });
        return send(200, { exportedAt: new Date().toISOString(), review });
      }
      if (req.method === 'GET' && path.startsWith('/api/data-previews/')) {
        const preview = workspaces.dataPreviews().find((item) => item.id === path.slice('/api/data-previews/'.length));
        if (!preview) return send(404, { error: 'Preview not found' });
        return send(200, { exportedAt: new Date().toISOString(), preview });
      }
      if (req.method === 'GET' && path.startsWith('/api/revisions/')) {
        const revision = store.getRevision(path.slice('/api/revisions/'.length));
        if (!revision) return send(404, { error: 'Revision not found' });
        return send(200, { exportedAt: new Date().toISOString(), revision: assessRevision(revision, store.facts(), scanContent(root), baseline(root)) });
      }
      if (req.method !== 'POST') return send(405, { error: 'Method not allowed' });
      if (req.headers.origin !== origin) return send(403, { error: 'Same-origin confirmation required' });
      if (req.headers['content-type'] !== 'application/json') return send(415, { error: 'Expected application/json' });
      let size = 0;
      const chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 128 * 1024) { send(413, { error: 'Request too large' }); return; }
        chunks.push(chunk);
      }
      let input;
      try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch { return send(400, { error: 'Invalid JSON' }); }
      if (!input || typeof input !== 'object' || Array.isArray(input)) return send(400, { error: 'Expected JSON object' });
      if (path === '/api/evidence') {
        let validated;
        try { validated = validateEvidence(input); }
        catch (error) { return send(400, { error: error.message }); }
        const result = store.importEvidence(validated);
        return send(result.duplicate ? 200 : 201, result);
      }
      if (path === '/api/official-source/collect') return send(200, { source: await sources.collect(input) });
      if (path === '/api/official-source/import-excerpt') {
        const result = sources.importExcerpt(input);
        return send(result.duplicate ? 200 : 201, result);
      }
      if (path === '/api/batches/close-no-update') {
        return send(200, store.closeBatch(input, { index: scanContent(root, store.facts()), baseline: baseline(root) }));
      }
      if (path === '/api/batches') {
        if (!input || typeof input.evidenceId !== 'string' || !store.getEvidence(input.evidenceId)) {
          return send(404, { error: 'Evidence not found' });
        }
        const index = scanContent(root);
        const git = baseline(root);
        const result = store.createBatch(input.evidenceId, (evidence, facts) => buildBatch(evidence, index, git, facts));
        return send(result.duplicate ? 200 : 201, result);
      }
      if (path === '/api/facts') {
        const result = store.createFact(input);
        return send(result.duplicate ? 200 : 201, result);
      }
      if (path === '/api/fact-reviews') return send(201, store.reviewFact(input));
      if (path === '/api/workspaces') {
        if (typeof input?.revisionId !== 'string' || input.confirmCreate !== true) throw new FactError('必须明确确认创建隔离工作区');
        return send(200, { workspace: workspaces.create(input.revisionId) });
      }
      if (path === '/api/draft-validations') {
        if (typeof input?.workspaceId !== 'string') throw new FactError('Workspace ID required');
        return send(201, { report: workspaces.validate(input.workspaceId) });
      }
      if (path === '/api/draft-review-packet') {
        if (typeof input?.workspaceId !== 'string' || typeof input.validationId !== 'string') throw new FactError('Workspace and validation required');
        return send(200, { packet: workspaces.reviewPacket(input.workspaceId, input.validationId) });
      }
      if (path === '/api/draft-reviews') {
        const result = workspaces.reviewDraft(input);
        return send(result.duplicate ? 200 : 201, result);
      }
      if (path === '/api/data-previews') {
        if (typeof input?.reviewId !== 'string' || input.confirmDataOnly !== true) throw new FactError('必须确认仅运行固定模板数据预览');
        const result = workspaces.previewDraft(input.reviewId);
        return send(result.duplicate ? 200 : 201, result);
      }
      if (path === '/api/application-previews') return send(201, { preview: await applicationPreviews.start(input) });
      if (path === '/api/execution-materials') return send(201, { material: executionMaterials.freeze(input) });
      if (path === '/api/execution-materials/exclusions') return send(200, { proposal: executionMaterials.prepareExclusions(input) });
      if (path === '/api/execution-materials/preparation-contract') return send(200, { contract: executionMaterials.preparationContract(input) });
      if (path === '/api/execution-materials/staging-contract') return send(200, { contract: executionMaterials.stagingContract(input) });
      if (path === '/api/mac-runtime-discovery') {
        if (input?.confirmReadOnly !== true) throw new FactError('必须确认仅只读检查固定安装路径和context元数据');
        return send(200, { report: discoverMacRuntime() });
      }
      if (path === '/api/execution-intents/inspection-contract') return send(200, { contract: store.executionIntents.inspectionContract(input) });
      if (path === '/api/execution-materials/dependency-plans') {
        const result = executionMaterials.recordDependencyPlan(input);
        return send(result.duplicate ? 200 : 201, result);
      }
      if (path === '/api/application-previews/stop') return send(200, { preview: applicationPreviews.stop(input?.id) });
      if (path === '/api/application-previews/check') return send(200, { preview: await applicationPreviews.check(input?.id) });
      if (path === '/api/application-previews/reconcile') return send(200, { preview: applicationPreviews.reconcile(input) });
      if (path === '/api/revisions') {
        const result = store.createRevision(input, { index: scanContent(root), baseline: baseline(root) });
        return send(result.duplicate ? 200 : 201, { ...result,
          revision: assessRevision(result.revision, store.facts(), scanContent(root), baseline(root)) });
      }
      return send(404, { error: 'Not found' });
    } catch (error) {
      if (error instanceof FactError) return send(error.status, { error: error.message });
      // Do not expose paths, imported text or database internals in HTTP errors.
      if (!res.headersSent) send(500, { error: 'Local operation failed. Its result may be incomplete; refresh and inspect saved state before retrying. No publish action was requested.' });
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  try {
    await new Promise((resolveReady, reject) => {
      server.once('error', reject);
      server.listen(port, '127.0.0.1', resolveReady);
    });
  } catch (error) {
    try { await applicationPreviews.close(); } finally { store.close(); }
    throw error;
  }
  origin = `http://127.0.0.1:${server.address().port}`;
  return { origin, token, close: () => {
    if (closePromise) return closePromise;
    closing = true;
    closePromise = (async () => {
      // Drain admitted HTTP operations before closing previews and their database.
      await new Promise((done, reject) => {
        server.close((error) => error ? reject(error) : done());
        server.closeIdleConnections();
      });
      try { await applicationPreviews.close(); } finally { store.close(); }
    })();
    return closePromise;
  } };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.WORKBENCH_PORT ?? 4317);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('WORKBENCH_PORT must be 1024–65535');
  const app = await startWorkbench({ port });
  console.log(`Local content workbench (no edit or publish permissions):\n${app.origin}/#token=${app.token}\nKeep this URL private. Token changes on restart.`);
  let stopping = false;
  const stop = async () => { if (stopping) return; stopping = true; await app.close(); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}
