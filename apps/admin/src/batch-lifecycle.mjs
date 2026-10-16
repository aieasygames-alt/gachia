import { fingerprint } from './revisions.mjs';
import { FactError } from './facts.mjs';
import { validateReviewIdentity } from './review-identity.mjs';

const paths = ['characters', 'weapons', 'materials', 'guides'].flatMap((kind) =>
  [`packages/data/games/hi3/raw-${kind}.json`, `apps/web/public/data/hi3/raw-${kind}.json`]);

export function closureCoverage(index) {
  const files = Array.isArray(index?.files) ? index.files : [];
  const findings = Array.isArray(index?.findings) ? index.findings : [];
  const missing = paths.filter((path) => files.filter((file) => file.path === path && /^[a-f0-9]{64}$/.test(file.digest)).length !== 1);
  const failed = findings.filter((item) => item.status === 'failed');
  const missingComparisons = paths.filter((path) => path.startsWith('apps/')).filter((path) =>
    !findings.some((item) => item.path === path && item.ruleId === 'mirror.content' && item.status === 'passed'));
  return { status: missing.length || failed.length || missingComparisons.length ? 'blocked' : 'ready',
    scope: 'hi3_four_datasets_and_public_mirrors_only',
    files: files.filter((file) => paths.includes(file.path)).map(({ path, digest }) => ({ path, digest })),
    missing, missingComparisons, failed,
    notCovered: ['翻译和事实语义', '其他数据集和页面代码', '搜索/sitemap/浏览器/生产状态'],
    meaning: '读取和镜像一致性门禁，不证明人工填写的内容核对结论正确' };
}

export function batchContext(batch, facts, index, baseline) {
  return fingerprint({ batch, facts: facts.filter((fact) => fact.evidenceId === batch.evidenceId),
    contentFingerprint: index.fingerprint, baseline });
}

export function validateBatchClosure(raw) {
  for (const key of ['batchId', 'requestId', 'contextDigest', 'reason', 'contentCheck', 'reviewer']) {
    if (typeof raw?.[key] !== 'string' || !raw[key].trim() || raw[key].length > 2000) {
      throw new FactError(`Invalid ${key}`);
    }
  }
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(raw.requestId) || !/^[a-f0-9]{64}$/.test(raw.contextDigest) ||
      raw.confirmNoUpdate !== true) throw new FactError('需要明确确认无需更新及当前核对上下文');
  return { batchId: raw.batchId, requestId: raw.requestId, contextDigest: raw.contextDigest,
    reason: raw.reason.trim(), contentCheck: raw.contentCheck.trim(), reviewer: raw.reviewer.trim(),
    confirmNoUpdate: true, ...validateReviewIdentity(raw) };
}

export function assessBatchClosure(batch, facts, index, baseline) {
  const closure = batch.lifecycle?.closure;
  if (!closure) return { status: 'open', contextDigest: batchContext(batch, facts, index, baseline), coverage: closureCoverage(index) };
  const original = { ...batch }; delete original.lifecycle;
  return { status: 'closed_no_update', closure,
    contextCurrent: closureCoverage(index).status === 'ready' && closure.contextDigest === batchContext(original, facts, index, baseline),
    permissions: { reopen: false, edit: false, publish: false } };
}
