const tables = ['evidence', 'batches', 'events', 'facts', 'fact_reviews', 'batch_revisions',
  'draft_workspaces', 'draft_validations', 'draft_reviews', 'data_previews', 'application_previews',
  'official_sources', 'official_source_runs', 'execution_materials', 'execution_intents'];

export function storageHealth(db) {
  // A deferred read transaction keeps counts and page metrics in one snapshot.
  db.exec('BEGIN');
  try {
    const pragma = (name) => db.prepare(`PRAGMA ${name}`).get()[name];
    const pageSize = pragma('page_size'); const pages = pragma('page_count'); const freePages = pragma('freelist_count');
    const counts = Object.fromEntries(tables.map((table) => [table, db.prepare(`SELECT count(*) AS count FROM ${table}`).get().count]));
    const report = { version: 1, observedAt: new Date().toISOString(), schemaVersion: pragma('user_version'),
      scope: 'sqlite_logical_snapshot_only', database: { pageSize, pages, freePages,
        allocatedBytes: pageSize * pages, reusableBytes: pageSize * freePages }, counts,
      notCovered: ['数据库/WAL/SHM实际文件大小', '备份、草案工作区、预览依赖与日志目录占用', '磁盘剩余空间与增长趋势', '完整性检查、备份可恢复性与磁盘不足演练'],
      policy: '未配置保留期限；不自动清理或压缩', permissions: { delete: false, vacuum: false, restore: false, publish: false } };
    db.exec('COMMIT'); return report;
  } catch (error) { if (db.isTransaction) db.exec('ROLLBACK'); throw error; }
}
