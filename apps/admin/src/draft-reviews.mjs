import { FactError } from './facts.mjs';
import { fingerprint } from './revisions.mjs';
import { validateReviewIdentity } from './review-identity.mjs';

export function uncoveredRules(report) {
  return [...new Set(report.checks.filter((check) => check.status === 'not_covered').map((check) => check.ruleId))].sort();
}

export function validateDraftReview(input, packet) {
  if (!input || typeof input.requestId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(input.requestId) ||
    !Number.isInteger(input.expectedLatest) || input.expectedLatest < 0 ||
    !['accepted', 'rejected'].includes(input.decision) ||
    typeof input.reviewer !== 'string' || !input.reviewer.trim() || input.reviewer.length > 80 ||
    typeof input.note !== 'string' || !input.note.trim() || input.note.length > 2000 ||
    input.packetDigest !== packet.digest || input.workspaceId !== packet.workspaceId || input.validationId !== packet.validation.id) {
    throw new FactError('审核对象已变化或审核信息无效，请重新加载草案审核材料', 409);
  }
  const acknowledged = input.acknowledgedRules;
  if (!Array.isArray(acknowledged) || acknowledged.some((item) => typeof item !== 'string') ||
    fingerprint([...new Set(acknowledged)].sort()) !== fingerprint(uncoveredRules(packet.validation))) {
    throw new FactError('必须逐项确认全部未覆盖检查');
  }
  if (input.diffChecked !== true || input.factsChecked !== true || input.noPublishUnderstood !== true) {
    throw new FactError('必须确认实际改动、事实适用范围以及此审核不授予发布权限');
  }
  if (input.decision === 'accepted' && (packet.validation.summary.failed > 0 || !packet.manifest.changes.length)) {
    throw new FactError('存在失败检查或没有实际改动，不能接受草案');
  }
  return { ...validateReviewIdentity(input), requestId: input.requestId, expectedLatest: input.expectedLatest, decision: input.decision,
    reviewer: input.reviewer.trim(), note: input.note.trim(), acknowledgedRules: [...new Set(acknowledged)].sort(),
    diffChecked: true, factsChecked: true, noPublishUnderstood: true };
}
