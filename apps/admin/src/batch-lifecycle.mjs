import { fingerprint } from './revisions.mjs';
import { FactError } from './facts.mjs';
import { validateReviewIdentity } from './review-identity.mjs';

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
  if (!closure) return { status: 'open', contextDigest: batchContext(batch, facts, index, baseline) };
  const original = { ...batch }; delete original.lifecycle;
  return { status: 'closed_no_update', closure,
    contextCurrent: closure.contextDigest === batchContext(original, facts, index, baseline),
    permissions: { reopen: false, edit: false, publish: false } };
}
