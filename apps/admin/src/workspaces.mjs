import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, lstatSync, realpathSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { FactError } from './facts.mjs';
import { fingerprint, assessRevision } from './revisions.mjs';
import { scanContent, baseline } from './content.mjs';
import { captureDraft, validateDraft, readDraftFile } from './draft-validation.mjs';
import { validateDraftReview } from './draft-reviews.mjs';
import { buildDataPreview } from './data-preview.mjs';

function git(root, args) {
  return execFileSync('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'core.fsmonitor=false', ...args], {
    cwd: root, encoding: 'utf8', timeout: 30000, maxBuffer: 2 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_OPTIONAL_LOCKS: '0' },
  });
}
const allowed = (path) => /^(packages\/data\/games\/hi3|apps\/web\/public\/data\/hi3)\/raw-[a-z0-9-]+\.json$/.test(path);
const hashBytes = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function workspaceService(root, dataDir, store) {
  const workspaceRoot = join(realpathSync(dataDir), 'workspaces');
  function assessment(revision) {
    return assessRevision(revision, store.facts(), scanContent(root), baseline(root)).assessment;
  }
  function checkPath(workspace) {
    if (!/^[a-f0-9-]{36}$/.test(workspace.id) || workspace.path !== join(workspaceRoot, workspace.id)) throw new Error('Invalid workspace path');
    if (existsSync(workspace.path) && (lstatSync(workspace.path).isSymbolicLink() || realpathSync(workspace.path) !== workspace.path)) throw new Error('Workspace path changed');
  }
  function registered(workspace) {
    return git(root, ['worktree', 'list', '--porcelain', '-z']).split('\0').includes(`worktree ${workspace.path}`);
  }
  function preflight(revision) {
    const state = assessment(revision);
    if (state.status !== 'current') throw new FactError(`修订已失效：${state.reasons.join('；')}`, 409);
    const commit = revision.snapshot.baseline.commit;
    if (!/^[a-f0-9]{40,64}$/.test(commit ?? '')) throw new FactError('无效 Git 基线', 409);
    // Checkout filters may execute commands; this tool only supports repositories without them.
    let filters = '';
    try { filters = git(root, ['config', '--get-regexp', '^filter\\.']); } catch (error) { if (error.status !== 1) throw error; }
    if (filters.trim()) throw new FactError('仓库配置了 Git checkout filter，需人工核对后才能接入隔离草案', 409);
    // Reject relevant dirty data rather than copying it into the clean checkout.
    const index = scanContent(root);
    for (const file of index.files) {
      let bytes;
      try { bytes = execFileSync('git', ['show', `${commit}:${file.path}`], { cwd: root, timeout: 5000, maxBuffer: 4 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }); }
      catch { throw new FactError('修订内容未包含在基线提交中；请先审核提交，再创建新修订', 409); }
      if (file.digest !== hashBytes(bytes)) throw new FactError('扫描内容与基线提交不同；禁止带入未提交游戏内容', 409);
    }
    if (index.findings.some((item) => item.status === 'failed')) throw new FactError('本地内容检查失败，无法创建草案工作区', 409);
    return commit;
  }
  function create(revisionId) {
    const revision = store.getRevision(revisionId);
    if (!revision) throw new FactError('Revision not found', 404);
    const commit = preflight(revision);
    mkdirSync(workspaceRoot, { recursive: true, mode: 0o700 });
    if (realpathSync(workspaceRoot) !== workspaceRoot) throw new FactError('工作区父目录不能是符号链接');
    const workspace = store.reserveWorkspace(revisionId, () => {
      const id = randomUUID();
      return { id, revisionId, path: join(workspaceRoot, id), baselineCommit: commit, snapshotDigest: revision.snapshotDigest,
        status: 'preparing', createdAt: new Date().toISOString() };
    });
    checkPath(workspace);
    try {
      if (!registered(workspace)) {
        if (existsSync(workspace.path)) throw new Error('Unregistered directory exists; manual reconciliation required');
        git(root, ['worktree', 'add', '--detach', workspace.path, commit]);
      }
      if (git(workspace.path, ['rev-parse', 'HEAD']).trim() !== commit) throw new Error('Workspace HEAD changed');
      workspace.status = 'ready'; delete workspace.error;
    } catch {
      workspace.status = 'needs_reconciliation';
      workspace.error = '工作区创建结果待核对。不会删除目录或覆盖文件；排除问题后可重试。';
    }
    store.updateWorkspace(workspace);
    return inspect(workspace);
  }
  function inspect(workspace) {
    const revision = store.getRevision(workspace.revisionId);
    const reasons = revision ? [...assessment(revision).reasons] : ['任务修订不存在'];
    let changes = []; let diff = '';
    try {
      checkPath(workspace);
      if (!registered(workspace)) throw new Error('Not registered');
      if (git(workspace.path, ['rev-parse', 'HEAD']).trim() !== workspace.baselineCommit) reasons.push('工作区 HEAD 已改变，必须人工核对');
      // Disable rename detection so both sides of a move are checked as independent paths.
      const paths = git(workspace.path, ['diff', '--no-renames', '--name-only', '-z', workspace.baselineCommit, '--']).split('\0').filter(Boolean);
      const untracked = git(workspace.path, ['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean);
      const ignored = git(workspace.path, ['ls-files', '--others', '--ignored', '--exclude-standard', '-z']).split('\0')
        .filter((path) => path && !/^(node_modules\/|apps\/web\/(node_modules|\.next)\/|packages\/[^/]+\/node_modules\/)/.test(path));
      changes = [...new Set([...paths, ...untracked, ...ignored])].map((path) => {
        let safe = allowed(path);
        const absolute = resolve(workspace.path, path);
        if (!absolute.startsWith(`${workspace.path}${sep}`)) safe = false;
        let stat;
        try { stat = lstatSync(absolute); } catch (error) { if (error.code !== 'ENOENT') safe = false; }
        if (stat) {
          if (stat.isSymbolicLink() || realpathSync(absolute) !== absolute) safe = false;
          if (safe) {
            try { JSON.parse(readDraftFile(workspace.path, path).toString('utf8')); } catch { safe = false; }
          }
        }
        return { path, allowed: safe, untracked: untracked.includes(path), ignored: ignored.includes(path) };
      });
      if (changes.some((item) => !item.allowed)) reasons.push('发现范围外文件、符号链接或无效 JSON；草案暂停');
      diff = git(workspace.path, ['diff', '--no-ext-diff', '--no-textconv', '--no-renames', workspace.baselineCommit, '--',
        'packages/data/games/hi3', 'apps/web/public/data/hi3']);
      if (workspace.status !== 'ready') reasons.push('创建步骤待对账，请重试创建以确认工作区');
    } catch { reasons.push('无法核对工作区，禁止继续；请人工检查目录与 Git 注册状态'); }
    return { ...workspace, inspection: { status: reasons.length ? 'blocked' : 'ready_for_manual_draft', reasons,
      checkedAt: new Date().toISOString(), changes, diff, diffDigest: fingerprint(diff),
      note: '只读范围检查，不是操作系统沙箱。未跟踪文件仅列出路径；无自动编辑、安装、构建、提交或发布。',
      capabilities: { edit: false, commit: false, publish: false } } };
  }
  function safeCapture(workspace) {
    try {
      checkPath(workspace);
      if (!registered(workspace)) throw new Error('Not registered');
      return captureDraft(workspace.path, workspace.inspection);
    } catch { return { fingerprint: null }; }
  }
  function assessReport(report, workspace) {
    const current = inspect(workspace);
    const capture = safeCapture(current);
    const stale = capture.fingerprint !== report.inputFingerprint || current.inspection.status === 'blocked';
    return { ...report, assessment: { status: stale ? 'stale' : 'current', checkedAt: new Date().toISOString(),
      reasons: stale ? ['草案内容、事实、基线或文件范围已变化，必须重新验证', ...current.inspection.reasons] : [],
      publish: false } };
  }
  function validate(workspaceId) {
    const saved = store.workspaces().find((item) => item.id === workspaceId);
    if (!saved) throw new FactError('Workspace not found', 404);
    const workspace = inspect(saved);
    if (workspace.inspection.status === 'blocked') throw new FactError(`草案暂停：${workspace.inspection.reasons.join('；')}`, 409);
    const capture = safeCapture(workspace);
    if (!capture.fingerprint) throw new FactError('无法安全读取草案工作区', 409);
    const report = validateDraft(workspace, capture);
    const after = safeCapture(inspect(saved));
    if (capture.fingerprint !== after.fingerprint) throw new FactError('验证期间草案发生变化，请重新验证', 409);
    store.saveValidation(report);
    return assessReport(report, saved);
  }
  function reports() {
    const saved = store.workspaces();
    return store.validations().map((report) => {
      const workspace = saved.find((item) => item.id === report.workspaceId);
      return workspace ? assessReport(report, workspace) : { ...report, assessment: { status: 'stale', publish: false, reasons: ['工作区不存在'] } };
    });
  }
  function reviewPacket(workspaceId, validationId) {
    const saved = store.workspaces().find((item) => item.id === workspaceId);
    const report = store.validations().find((item) => item.id === validationId && item.workspaceId === workspaceId);
    if (!saved || !report) throw new FactError('Workspace or validation not found', 404);
    const workspace = inspect(saved);
    const capture = safeCapture(workspace);
    if (!capture.fingerprint || capture.fingerprint !== report.inputFingerprint || workspace.inspection.status === 'blocked') {
      throw new FactError('草案验证已过期或工作区暂停，请重新验证', 409);
    }
    const contents = []; let total = 0;
    for (const change of capture.changes) {
      let baselineContent;
      try { baselineContent = git(workspace.path, ['show', `${saved.baselineCommit}:${change.path}`]); }
      catch {
        // Only a genuinely absent path is an addition; read errors must not become empty baselines.
        const listed = git(workspace.path, ['ls-tree', '--name-only', saved.baselineCommit, '--', change.path]).trim();
        if (listed) throw new FactError('无法读取基线文件，不能生成审核材料', 409);
        baselineContent = '[]';
      }
      total += Buffer.byteLength(baselineContent);
      if (total > 1024 * 1024) throw new FactError('基线与草案审核材料超过 1 MiB，请拆分批次', 409);
      const file = capture.files.find((item) => item.path === change.path);
      if (!file) { contents.push({ path: change.path, deleted: true, baselineContent }); continue; }
      if (file.error || total + file.bytes > 1024 * 1024) throw new FactError('审核材料超过 1 MiB 或存在不可读文件，请拆分批次', 409);
      let bytes;
      try { bytes = readDraftFile(workspace.path, file.path, 1024 * 1024 - total); }
      catch { throw new FactError('审核文件不可安全读取或超过剩余材料预算，请重新验证或拆分批次', 409); }
      if (hashBytes(bytes) !== file.digest) throw new FactError('加载审核材料时文件变化，请重试', 409);
      total += bytes.length;
      contents.push({ path: file.path, digest: file.digest, content: bytes.toString('utf8'), baselineContent });
    }
    const revision = store.getRevision(saved.revisionId);
    const packet = { workspaceId, revisionId: saved.revisionId, baselineCommit: saved.baselineCommit,
      revisionDigest: revision.snapshotDigest, confirmedFacts: revision.snapshot.confirmedFacts,
      validation: report, manifest: capture, diff: workspace.inspection.diff, contents,
      capabilities: { commit: false, publish: false } };
    if (safeCapture(inspect(saved)).fingerprint !== capture.fingerprint) throw new FactError('审核材料读取期间变化，请重试', 409);
    return { ...packet, digest: fingerprint(packet) };
  }
  function assessReview(review) {
    const reasons = [];
    try {
      const packet = reviewPacket(review.workspaceId, review.validationId);
      if (packet.digest !== review.packetDigest) reasons.push('审核绑定的材料已变化');
    } catch { reasons.push('文件、验证、事实或基线已变化，审核不再适用'); }
    const latest = store.draftReviews().find((item) => item.workspaceId === review.workspaceId);
    if (latest?.id !== review.id) reasons.push('已有后续审核，此记录仅作历史参考');
    return { ...review, assessment: { status: reasons.length ? 'stale' : 'current', reasons, checkedAt: new Date().toISOString(),
      meaning: '仅草案审核记录，身份为自报，不授予提交或发布权限', capabilities: { commit: false, publish: false } } };
  }
  function reviewDraft(input) {
    if (!input || typeof input.requestId !== 'string') throw new FactError('Review request ID required');
    const requestDigest = fingerprint(input);
    const previous = store.findDraftReviewRequest(input.requestId, requestDigest);
    if (previous) return { review: assessReview(previous), duplicate: true };
    const packet = reviewPacket(input.workspaceId, input.validationId);
    const validated = validateDraftReview(input, packet);
    const result = store.saveDraftReview(validated, packet, requestDigest);
    return { ...result, review: assessReview(result.review) };
  }
  function assessPreview(preview) {
    const savedReview = store.draftReviews().find((item) => item.id === preview.reviewId);
    const review = savedReview ? assessReview(savedReview) : null;
    const stale = !review || review.decision !== 'accepted' || review.assessment.status !== 'current' || review.packetDigest !== preview.packetDigest;
    return { ...preview, assessment: { status: stale ? 'stale' : 'current', checkedAt: new Date().toISOString(),
      reasons: stale ? ['草案审核已过期、被后续决定取代或不再接受，数据预览仅供历史追溯'] : [], publish: false } };
  }
  function previewDraft(reviewId) {
    const saved = store.draftReviews().find((item) => item.id === reviewId);
    if (!saved) throw new FactError('Draft review not found', 404);
    const review = assessReview(saved);
    if (review.decision !== 'accepted' || review.assessment.status !== 'current') throw new FactError('必须选择当前有效且已接受的草案审核', 409);
    const result = store.saveDataPreview({ ...buildDataPreview(review), id: randomUUID(), createdAt: new Date().toISOString(),
      capabilities: { executeProjectCode: false, commit: false, publish: false } });
    return { ...result, preview: assessPreview(result.preview) };
  }
  return { create, inspect, validate, reports, reviewPacket, reviewDraft,
    acceptedReview(reviewId) {
      const saved = store.draftReviews().find((item) => item.id === reviewId);
      if (!saved) throw new FactError('Draft review not found', 404);
      const current = assessReview(saved);
      if (current.decision !== 'accepted' || current.assessment.status !== 'current') throw new FactError('草案审核已过期或未接受', 409);
      return current;
    },
    previewDraft, dataPreviews: () => store.dataPreviews().map(assessPreview),
    draftReviews: () => store.draftReviews().map(assessReview), list: () => store.workspaces().map(inspect) };
}
