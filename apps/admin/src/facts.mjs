import { validateReviewIdentity } from './review-identity.mjs';

export class FactError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

function text(input, key, max, optional = false) {
  if (typeof input?.[key] !== 'string') throw new FactError(`Invalid ${key}`);
  const value = input[key].trim().replace(/\r\n?/g, '\n');
  if ((!optional && !value) || value.length > max) throw new FactError(`Invalid ${key}`);
  return value;
}

function date(input, key) {
  const value = text(input, key, 10, true);
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString().slice(0, 10) !== value) throw new FactError(`Invalid ${key}`);
  return value;
}

export function validateFact(input, evidence) {
  if (!evidence) throw new FactError('Evidence not found', 404);
  const quote = text(input, 'quote', 4000);
  if (!evidence.body.includes(quote)) throw new FactError('出处片段必须逐字出现在证据原文中');
  const server = text(input, 'server', 80);
  if (server !== evidence.server) throw new FactError('服务器必须与证据记录一致；范围有误请重新导入证据');
  const lifecycle = text(input, 'lifecycle', 20);
  if (!['announced', 'test', 'live', 'historical', 'unknown'].includes(lifecycle)) throw new FactError('Invalid lifecycle');
  const validFrom = date(input, 'validFrom');
  const validUntil = date(input, 'validUntil');
  if (validFrom && validUntil && validUntil < validFrom) throw new FactError('结束日期不能早于生效日期');
  return { evidenceId: evidence.id, gameId: evidence.gameId, entity: text(input, 'entity', 200),
    field: text(input, 'field', 100), value: text(input, 'value', 4000), quote, server,
    language: evidence.language, lifecycle, validFrom, validUntil,
    sourceUrl: evidence.url, evidenceFingerprint: evidence.fingerprint, sourceType: evidence.sourceType };
}

export function validateReview(input, fact) {
  if (!fact) throw new FactError('Fact not found', 404);
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new FactError('Invalid review input');
  if (!Number.isInteger(input.expectedRevision) || input.expectedRevision !== fact.revision) {
    throw new FactError('审核版本已变化，请刷新后重新审核', 409);
  }
  const decision = text(input, 'decision', 20);
  if (!['confirmed', 'rejected', 'needs_review'].includes(decision)) throw new FactError('Invalid decision');
  if (decision === 'confirmed') {
    if (fact.sourceType !== 'official_claim') throw new FactError('玩家讨论不能确认为官方事实');
    if (input.sourceChecked !== true || input.scopeChecked !== true || input.valueChecked !== true) {
      throw new FactError('确认前必须核实来源身份、适用范围及字段值与条件');
    }
    if (fact.lifecycle === 'unknown' || /待确认|未知|unknown/i.test(fact.server)) {
      throw new FactError('服务器或上线状态待确认，不能确认为事实');
    }
  }
  return { ...validateReviewIdentity(input), decision, reviewer: text(input, 'reviewer', 80), note: text(input, 'note', 2000),
    sourceChecked: input.sourceChecked === true, scopeChecked: input.scopeChecked === true,
    valueChecked: input.valueChecked === true };
}
