import { realpathSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { GAME_DEPLOYMENTS } from '../../../packages/core/deployments.ts';
import { assessDataQuality } from './data-quality.mjs';
import { readBoundedFile } from './bounded-file.mjs';

const kinds = ['characters', 'weapons', 'materials', 'guides'];
const digest = (value) => createHash('sha256').update(value).digest('hex');
export const PROTECTED_PATHS = ['.github/**', 'scripts/**', 'apps/router/**', '**/wrangler*',
  'packages/db/**', '**/package.json', 'pnpm-lock.yaml', '**/*test*', '**/*spec*'];

export function validateEvidence(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected an object');
  const text = (key, max, required = true) => {
    if (typeof value[key] !== 'string') throw new Error(`Invalid ${key}`);
    const result = value[key].trim().replace(/\r\n?/g, '\n');
    if ((required && !result) || result.length > max) throw new Error(`Invalid ${key}`);
    return result;
  };
  const url = new URL(text('url', 2048));
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('Use an HTTPS source URL without credentials, query parameters or fragment');
  }
  const language = text('language', 8);
  if (!['zh', 'en', 'ja'].includes(language)) throw new Error('Invalid language');
  const publishedAt = text('publishedAt', 10, false);
  if (publishedAt && (!/^\d{4}-\d{2}-\d{2}$/.test(publishedAt) ||
    !Number.isFinite(Date.parse(publishedAt)) || new Date(publishedAt).toISOString().slice(0, 10) !== publishedAt)) {
    throw new Error('Invalid publication date');
  }
  const sourceType = text('sourceType', 20);
  if (!['official_claim', 'discussion'].includes(sourceType)) throw new Error('Invalid source type');
  return { gameId: 'hi3', title: text('title', 200), url: url.href, body: text('body', 30000),
    server: text('server', 80), language, publishedAt: publishedAt || null, sourceType };
}

export function scanContent(root, facts = []) {
  root = realpathSync(root);
  const findings = [];
  const entries = [];
  const files = [];
  const datasets = [];
  for (const kind of kinds) {
    const source = `packages/data/games/hi3/raw-${kind}.json`;
    const mirror = `apps/web/public/data/hi3/raw-${kind}.json`;
    try {
      const bytes = readBoundedFile(join(root, source), 4 * 1024 * 1024);
      const rows = JSON.parse(bytes);
      if (!Array.isArray(rows)) throw new Error('Expected array');
      datasets.push({ kind, rows });
      files.push({ path: source, digest: digest(bytes) });
      let mirrorRows;
      try {
        const mirrorBytes = readBoundedFile(join(root, mirror), 4 * 1024 * 1024);
        files.push({ path: mirror, digest: digest(mirrorBytes) });
        mirrorRows = JSON.parse(mirrorBytes);
      } catch { findings.push({ ruleId: 'mirror.read', status: 'failed', path: mirror, message: '镜像缺失或无法解析' }); }
      if (mirrorRows) findings.push({ ruleId: 'mirror.content', path: mirror,
        status: JSON.stringify(rows) === JSON.stringify(mirrorRows) ? 'passed' : 'failed', message: '源数据与公共镜像内容比较' });
      const ids = new Set();
      for (const row of rows) {
        if (!row || typeof row !== 'object' || Array.isArray(row) || typeof row.id !== 'string' || !/^[a-z0-9-]+$/.test(row.id) || ids.has(row.id)) {
          findings.push({ ruleId: 'entity.id', path: source, status: 'failed', message: '实体 ID 无效或重复' });
          continue;
        }
        ids.add(row.id);
        const label = kind === 'guides' ? 'title' : 'name';
        const missingLocales = ['', 'En', 'Ja'].filter((suffix) => typeof row[`${label}${suffix}`] !== 'string' || !row[`${label}${suffix}`].trim())
          .map((suffix) => suffix === '' ? 'zh' : suffix.toLowerCase());
        const route = kind === 'materials' ? 'items' : kind;
        entries.push({ kind, id: row.id, title: row[label], labels: localesFor(row, label), source, missingLocales,
          routes: ['zh', 'en', 'ja'].map((locale) => `/${locale}/hi3/${route}/${row.id}`) });
        if (missingLocales.length) findings.push({ ruleId: 'locale.label', path: source, status: 'failed', message: `${row.id}: 缺少 ${missingLocales.join(', ')} 标题` });
      }
    } catch {
      findings.push({ ruleId: 'source.read', path: source, status: 'failed', message: '源文件缺失或无法解析' });
    }
  }
  for (const ruleId of ['locale.body', 'directory.reachability', 'search.coverage', 'sitemap.coverage', 'browser.behavior', 'freshness', 'production.version']) {
    findings.push({ ruleId, status: 'not_covered', message: '本阶段未验证，不能据此判定通过' });
  }
  const qualityInputs = files.filter((file) => file.path.startsWith('packages/')).map((file) => ({ ...file, status: 'read' }));
  const additionalMirrors = [];
  for (const kind of ['astral-ops', 'stigma-sets']) {
    const path = `packages/data/games/hi3/raw-${kind}.json`;
    const mirrorPath = `apps/web/public/data/hi3/raw-${kind}.json`;
    let sourceRows;
    try {
      const bytes = readBoundedFile(join(root, path), 4 * 1024 * 1024); const rows = JSON.parse(bytes);
      if (!Array.isArray(rows)) throw new Error('Expected array');
      sourceRows = rows;
      datasets.push({ kind, rows }); qualityInputs.push({ path, digest: digest(bytes), status: 'read' });
    } catch { qualityInputs.push({ path, status: 'unavailable' }); }
    let mirrorDigest = null; let status = 'unavailable'; let reason = 'mirror_missing_or_invalid';
    try {
      const bytes = readBoundedFile(join(root, mirrorPath), 4 * 1024 * 1024); const rows = JSON.parse(bytes);
      if (!Array.isArray(rows)) throw new Error('Expected array');
      mirrorDigest = digest(bytes);
      status = sourceRows ? JSON.stringify(sourceRows) === JSON.stringify(rows) ? 'passed' : 'needs_review' : 'not_checked';
      reason = !sourceRows ? 'source_unavailable' : status === 'passed' ? 'parsed_arrays_equal' : 'parsed_arrays_differ';
    } catch { /* Missing or invalid mirrors remain explicit, never treated as empty data. */ }
    additionalMirrors.push({ kind, sourcePath: path, mirrorPath, mirrorDigest, status, reason,
      ruleId: 'quality.additional_mirror_content', semanticVerified: false, affectsRevisionFingerprint: false });
  }
  const quality = assessDataQuality(datasets, facts);
  quality.coverage.inputs = qualityInputs;
  quality.coverage.additionalDatasetScope = 'source_and_mirror_quality_only_not_routes_or_revision_fingerprint';
  quality.coverage.additionalMirrors = additionalMirrors;
  quality.summary.additionalMirrorChecks = additionalMirrors.length;
  quality.summary.additionalMirrorNeedsReview = additionalMirrors.filter((mirror) => mirror.status !== 'passed').length;
  return { gameId: 'hi3', scannedAt: new Date().toISOString(), entries, files, findings,
    quality,
    fingerprint: digest(JSON.stringify(files)), deployment: GAME_DEPLOYMENTS.hi3 ?? { deployment: 'main', worker: 'gachia' } };
}

function localesFor(row, label) {
  return ['', 'En', 'Ja'].map((suffix) => row[`${label}${suffix}`]).filter((value) => typeof value === 'string' && value.trim());
}

export function baseline(root) {
  try {
    const options = { cwd: root, encoding: 'utf8', timeout: 5000, maxBuffer: 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] };
    return { commit: execFileSync('git', ['rev-parse', 'HEAD'], options).trim(),
      dirty: Boolean(execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], options).trim()) };
  } catch { return { commit: null, dirty: null }; }
}

export function buildBatch(evidence, index, git, facts = []) {
  const terms = evidence.body.toLowerCase();
  const suggested = index.entries.filter((entry) => terms.includes(entry.id.toLowerCase()) ||
    (entry.labels ?? [entry.title]).some((label) => label && terms.includes(label.toLowerCase())));
  return { gameId: 'hi3', title: evidence.title, server: evidence.server, status: 'awaiting_fact_review',
    baseline: git, contentFingerprint: index.fingerprint, deployment: index.deployment,
    evidenceIds: [evidence.id], confirmedFacts: facts.filter((fact) => fact.status === 'confirmed'),
    factSnapshot: facts, factReviewPolicy: 'snapshot_only_not_draft_or_publish_approval',
    pendingFacts: [{ evidenceId: evidence.id, reason: '人工导入尚未核实来源身份、服务器、实体、日期和数值；讨论不可转为官方事实。' }],
    suggestedPages: suggested, suggestionMethod: 'literal_entity_match_not_semantic_analysis',
    proposedNewPages: [], allowedPaths: ['packages/data/games/hi3/raw-*.json', 'apps/web/public/data/hi3/raw-*.json'],
    protectedPaths: PROTECTED_PATHS,
    checks: index.findings,
    requirements: ['核验原文与服务器范围', '审核日期、身份、奖励及数值', '三语正文与目录联动', '源数据、镜像和搜索一致',
      'sitemap、页面及浏览器验收', '开发前从确定提交创建隔离工作区；当前扫描仅作上下文，不作为生产产物'],
    budget: { aiCalls: 0, networkRequests: 0 }, capabilities: { edit: false, publish: false },
  };
}
