const kinds = ['evidence', 'facts', 'reviews', 'batches', 'revisions', 'workspaces', 'validations', 'draftReviews', 'dataPreviews', 'applicationPreviews', 'executionMaterials', 'executionIntents', 'officialSources', 'sourceRuns'];
const links = { evidenceId: 'evidence', factId: 'facts', batchId: 'batches', revisionId: 'revisions', workspaceId: 'workspaces',
  validationId: 'validations', reviewId: 'draftReviews', materialId: 'executionMaterials', sourceId: 'officialSources' };

// Candidates are discussion items only. No age policy or deletion permission is inferred.
export function buildCleanupPlan(snapshot) {
  const nodes = new Map(); const diagnostics = []; const issueCounts = {}; let diagnosticCount = 0;
  const diagnose = (value) => {
    diagnosticCount++; issueCounts[value.issue] = (issueCounts[value.issue] ?? 0) + (value.count ?? 1);
    if (diagnostics.length < 100) diagnostics.push(value);
  };
  let complete = snapshot.complete === true;
  for (const table of snapshot.coverage ?? []) if (table.truncated) {
    complete = false; diagnose({ kind: table.kind, issue: 'record_budget_exceeded' });
  }
  for (const table of snapshot.referenceCoverage ?? []) {
    if (table.truncated) { complete = false; diagnose({ kind: table.kind, issue: 'reference_budget_exceeded' }); }
    if (table.skippedOversizedPayloads) {
      complete = false; diagnose({ kind: table.kind, issue: 'payload_byte_budget_exceeded', count: table.skippedOversizedPayloads });
    }
  }
  for (const kind of kinds) for (const record of snapshot.records[kind] ?? []) {
    const key = `${kind}:${record.id}`;
    if (typeof record.id !== 'string' || !record.id || nodes.has(key)) {
      complete = false; diagnose({ kind, issue: 'invalid_or_duplicate_id' }); continue;
    }
    nodes.set(key, { kind, id: record.id, status: record.status ?? null, referencedBy: [], reasons: [] });
  }
  for (const edge of snapshot.nestedReferences ?? []) {
    const source = nodes.get(`${edge.kind}:${edge.id}`);
    const target = nodes.get(`${edge.targetKind}:${edge.targetId}`);
    if (!source || !target) { complete = false; diagnose({ kind: edge.kind, id: edge.id, field: edge.path, issue: 'unresolved_nested_reference' }); }
    else target.referencedBy.push(`${edge.kind}:${edge.id}:${edge.path}`);
  }
  for (const record of snapshot.records.evidence ?? []) {
    if (record.sourceDigest == null) continue;
    const matches = [...(snapshot.records.officialSources ?? []), ...(snapshot.records.sourceRuns ?? [])]
      .filter((item) => (item.sourceId ?? item.id) === record.sourceId && item.digest === record.sourceDigest);
    if (!matches.length) { complete = false; diagnose({ kind: 'evidence', id: record.id, issue: 'source_snapshot_digest_not_observed' }); }
    for (const item of matches) {
      const kind = item.sourceId ? 'sourceRuns' : 'officialSources';
      nodes.get(`${kind}:${item.id}`)?.referencedBy.push(`evidence:${record.id}:sourceSnapshot`);
    }
  }
  for (const kind of kinds) for (const record of snapshot.records[kind] ?? []) {
    for (const [field, targetKind] of Object.entries(links)) {
      if (record[field] == null) continue;
      const target = nodes.get(`${targetKind}:${record[field]}`);
      if (!target) { complete = false; diagnose({ kind, id: record.id, field, issue: 'unresolved_reference' }); }
      else target.referencedBy.push(`${kind}:${record.id}`);
    }
  }
  const items = [...nodes.values()].map((node) => {
    node.referencedBy = [...new Set(node.referencedBy)];
    if (node.referencedBy.length) node.reasons.push('referenced_record');
    if (node.kind !== 'evidence') node.reasons.push('audit_or_draft_history_protected');
    if ((snapshot.records.evidence ?? []).some((item) => item.id === node.id && node.kind === 'evidence' && item.sourceDigest != null)) node.reasons.push('source_provenance_protected');
    if (node.status === 'needs_review') node.reasons.push('pending_review');
    if (['preparing', 'starting', 'running', 'checking', 'stopping', 'reserved', 'launching', 'identity_recorded', 'needs_reconciliation'].includes(node.status)) node.reasons.push('active_or_unreconciled');
    if (!complete) node.reasons.push('incomplete_reference_scan');
    return { ...node, referenceCount: node.referencedBy.length, referencedBy: node.referencedBy.slice(0, 20),
      disposition: node.reasons.length ? 'protected' : 'candidate_for_policy_review_not_deletion' };
  });
  return { version: 'cleanup-plan-v3', observedAt: new Date().toISOString(), mode: 'saved_record_metadata_only',
    assessment: complete ? 'configured_fields_observed_not_full_audit' : 'incomplete_all_candidates_suppressed',
    issueCounts, issueCountsScope: 'all_observed_diagnostics',
    budgets: { recordsPerTable: 2000, referencesPerTable: 10000, nestedPayloadBytes: 1048576,
      hardTimeLimit: false, hardCpuLimit: false },
    complete, tableCoverage: snapshot.coverage, referenceCoverage: snapshot.referenceCoverage, items: items.slice(0, 500), itemsTruncated: items.length > 500,
    summary: { observed: items.length, protected: items.filter((item) => item.reasons.length).length,
      candidates: items.filter((item) => !item.reasons.length).length }, diagnostics, diagnosticCount, diagnosticsTruncated: diagnosticCount > diagnostics.length,
    permissions: { delete: false, overwrite: false, restore: false }, retentionPolicy: 'not_configured',
    notCovered: ['External databases, exported reports and agent-stage workspaces', 'Filesystem contents and actual process state',
      'Embedded references outside configured key/array paths; article contents and source completeness', 'Age/retention policy, storage savings and deletion impact execution'],
    warning: '候选仅表示已扫描字段未见引用；不是可删除证明。所有审核/任务/草案历史默认保护，未配置期限，不执行清理。' };
}
