import { createHash } from 'node:crypto';
import { FactError } from './facts.mjs';

export const fingerprint = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function validateRevision(input) {
  if (!input || typeof input.batchId !== 'string' || typeof input.requestId !== 'string' ||
    !/^[a-zA-Z0-9-]{16,80}$/.test(input.requestId) || !Number.isInteger(input.expectedLatest) || input.expectedLatest < 0 ||
    typeof input.note !== 'string' || !input.note.trim() || input.note.length > 2000 ||
    !Array.isArray(input.selectedFacts) || !input.selectedFacts.length || input.selectedFacts.length > 100) {
    throw new FactError('修订需要任务、请求标识、版本、理由及明确选择的事实');
  }
  const selectedFacts = input.selectedFacts.map((item) => {
    if (!item || typeof item.id !== 'string' || !Number.isInteger(item.revision) || item.revision < 1) throw new FactError('Invalid fact selection');
    return { id: item.id, revision: item.revision };
  }).sort((a, b) => a.id.localeCompare(b.id));
  if (new Set(selectedFacts.map((item) => item.id)).size !== selectedFacts.length) throw new FactError('事实不能重复选择');
  return { batchId: input.batchId, requestId: input.requestId, expectedLatest: input.expectedLatest,
    note: input.note.trim(), selectedFacts };
}

export function assessRevision(record, facts, index, baseline) {
  const reasons = [];
  if (record.snapshotDigest !== fingerprint(record.snapshot)) reasons.push('修订快照摘要不匹配');
  if (record.invalidatedAt) reasons.push('事实审核曾变化，此修订永久失效；重新确认后须创建新修订');
  for (const captured of record.snapshot.confirmedFacts) {
    const current = facts.find((fact) => fact.id === captured.id);
    if (!current || current.status !== 'confirmed' || current.revision !== captured.revision || current.fingerprint !== captured.fingerprint) {
      reasons.push(`事实已变化或不再确认: ${captured.id}`);
    }
  }
  if (record.snapshot.contentFingerprint !== index.fingerprint) reasons.push('内容扫描指纹已变化');
  if (fingerprint(record.snapshot.deployment) !== fingerprint(index.deployment)) reasons.push('部署归属已变化');
  if (record.snapshot.baseline.commit !== baseline.commit || !baseline.commit) reasons.push('Git 基线已变化或不可读取');
  return { ...record, assessment: { status: reasons.length ? 'invalid' : 'current', reasons,
    meaning: '仅说明选定事实与扫描上下文仍匹配，不是草案或发布审批',
    capabilities: { edit: false, publish: false } } };
}
