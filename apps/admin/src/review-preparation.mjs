import { createHash } from 'node:crypto';

export function reviewPreparation(evidence, facts, store) {
  const binding = evidence.sourceSnapshot;
  if (!binding) return null;
  const lookup = store.sourceSnapshotLookup?.(binding.sourceId, binding.digest);
  const snapshot = lookup ? lookup.snapshot : store.sourceSnapshot(binding.sourceId, binding.digest);
  const article = Array.isArray(snapshot?.articles) ? snapshot.articles.find((item) => item && item.id === binding.articleId) : null;
  const matches = article && typeof article.rawHtml === 'string' && createHash('sha256').update(article.rawHtml).digest('hex') === binding.articleDigest;
  return { evidenceId: evidence.id, status: matches ? 'bound' : 'context_unavailable',
    contextDiagnostic: lookup ? { status: lookup.status, observed: lookup.observed, bytes: lookup.bytes,
      maxRecords: lookup.maxRecords, maxBytes: lookup.maxBytes } : null,
    meaning: '材料绑定不等于来源、范围、时效或字段值已确认',
    context: matches ? { title: article.title, url: article.url, rawHtml: article.rawHtml,
      publishedAt: article.publishedAt, server: article.server, fetchedAt: binding.fetchedAt } : null,
    candidates: facts.filter((fact) => fact.evidenceId === evidence.id).map((fact) => ({ id: fact.id,
      entity: fact.entity, field: fact.field, value: fact.value, quote: fact.quote, status: fact.status,
      revision: fact.revision, lifecycle: fact.lifecycle, validFrom: fact.validFrom, validUntil: fact.validUntil })),
    checklist: ['官方来源身份与正文上下文', '国际服具体区域及服务器适用性', '公告发布日期不等于生效日，版本结束不等于永久装备效果失效',
      '实体身份、代词指代、装备形态、触发条件及数值', '中英日正式译名与事实时效；未核实保持待审核'],
    permissions: { autoConfirm: false, publish: false } };
}
