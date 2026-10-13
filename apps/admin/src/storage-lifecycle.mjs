export function compareStorage(previous, current) {
  const unavailable = (reason) => ({ status: 'unavailable', reason, permissions: { delete: false, restore: false } });
  if (!previous || !current || previous.schemaVersion !== current.schemaVersion || previous.scope !== current.scope) return unavailable('no_compatible_session_snapshot');
  const countObject = (value) => value && typeof value === 'object' && !Array.isArray(value);
  const metric = (value) => Number.isSafeInteger(value) && value >= 0;
  if (!countObject(previous.counts) || !countObject(current.counts) ||
    !metric(previous.database?.allocatedBytes) || !metric(current.database?.allocatedBytes) ||
    Object.keys(previous.counts).length !== Object.keys(current.counts).length ||
    Object.keys(current.counts).some((key) => !Object.hasOwn(previous.counts, key) || !metric(current.counts[key]) || !metric(previous.counts[key]))) {
    return unavailable('incomplete_or_invalid_snapshot_metrics');
  }
  return { status: 'two_observations_not_trend', from: previous.observedAt, until: current.observedAt,
    allocatedBytesDelta: current.database.allocatedBytes - previous.database.allocatedBytes,
    countsDelta: Object.fromEntries(Object.keys(current.counts).map((key) => [key, current.counts[key] - previous.counts[key]])),
    apparentBytesDelta: previous.files && current.files && previous.files.result === 'complete_metadata_scan' && current.files.result === 'complete_metadata_scan' && metric(previous.files.totalApparentBytes) && metric(current.files.totalApparentBytes) ? current.files.totalApparentBytes - previous.files.totalApparentBytes : null,
    permissions: { delete: false, restore: false }, warning: '非原子观测；差值不是删除建议或长期趋势' };
}

export const recoveryCoverage = Object.freeze({ version: 2, result: 'partial_fixture_coverage',
  verifiedTables: ['evidence', 'facts', 'fact_reviews', 'batches', 'batch_revisions', 'events', 'official_sources', 'official_source_runs',
    'draft_workspaces', 'draft_validations', 'draft_reviews', 'data_previews', 'application_previews', 'execution_materials', 'execution_intents'],
  notVerifiedTables: [],
  tableVerificationMeaning: 'synthetic_saved_rows_snapshot_preservation_not_filesystem_or_runtime_recovery',
  tableScenarios: { draftExecutionTables: { test: 'recovery-draft-tables.test.mjs', checks: ['exact_SQL_rows', 'integrity_and_foreign_keys',
    'agent_identity_and_packet_bytes', 'review_request_and_preview_idempotency', 'expired_intent_fence', 'running_preview_reconciliation_no_launch'] } },
  scenarios: ['independent_snapshot', 'synthetic_review_revision_history', 'non_sqlite_truncated_rejection', 'mock_backup_failure', 'sqlite_logical_full', 'automatic_rollback', 'writer_SIGKILL'],
  notCovered: ['目录/依赖/真实应用状态与数据库联合恢复', '真实草案有效性/权限和制品重验', '每张表全部字段/所有故障组合', '主机ENOSPC/断电', '全面损坏检测', '真实覆盖恢复'],
  permissions: { restore: false, delete: false } });
