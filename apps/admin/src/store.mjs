import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { validateFact, validateReview, FactError } from './facts.mjs';
import { fingerprint, validateRevision } from './revisions.mjs';
import { executionIntentStore } from './execution-intents.mjs';
import { storageHealth } from './storage-health.mjs';
import { sourceHistoryQuery } from './source-history-query.mjs';
import { batchContext, validateBatchClosure, closureCoverage } from './batch-lifecycle.mjs';

export function openStore(filename, { intentNow = Date.now } = {}) {
  mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(filename);
  try {
    chmodSync(filename, 0o600);
    db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
    const version = db.prepare('PRAGMA user_version').get().user_version;
    if (version > 13) {
      throw new Error('Workbench data is newer than this application. Upgrade before opening it.');
    }
    if (version > 0 && version < 13) {
      // SQLite snapshots include committed WAL data. Never migrate without a backup.
      const backup = `${filename}.v${version}-${randomUUID()}.bak`;
      db.exec(`VACUUM INTO '${backup.replaceAll("'", "''")}'`);
      chmodSync(backup, 0o600);
    }
    if (version === 0) db.exec(`
      BEGIN;
      CREATE TABLE evidence (
        id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL UNIQUE,
        payload TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE batches (
        id TEXT PRIMARY KEY, evidence_id TEXT NOT NULL UNIQUE REFERENCES evidence(id),
        payload TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE events (
        id INTEGER PRIMARY KEY, kind TEXT NOT NULL, object_id TEXT NOT NULL, created_at TEXT NOT NULL
      );
      PRAGMA user_version=1;
      COMMIT;
    `);
    if (version < 2) {
      db.exec(`BEGIN;
        CREATE TABLE facts (
          id TEXT PRIMARY KEY, evidence_id TEXT NOT NULL REFERENCES evidence(id),
          fingerprint TEXT NOT NULL UNIQUE, payload TEXT NOT NULL, created_at TEXT NOT NULL
        );
        CREATE TABLE fact_reviews (
          id TEXT PRIMARY KEY, fact_id TEXT NOT NULL REFERENCES facts(id),
          revision INTEGER NOT NULL, payload TEXT NOT NULL, UNIQUE(fact_id, revision)
        );
        PRAGMA user_version=2;
        COMMIT;
      `);
    }
    if (version < 3) db.exec(`BEGIN;
      CREATE TABLE batch_revisions (
        id TEXT PRIMARY KEY, batch_id TEXT NOT NULL REFERENCES batches(id),
        number INTEGER NOT NULL, request_id TEXT NOT NULL UNIQUE, request_digest TEXT NOT NULL,
        payload TEXT NOT NULL, invalidated_at TEXT, UNIQUE(batch_id, number)
      );
      PRAGMA user_version=3;
      COMMIT;
    `);
    if (version < 4) db.exec(`BEGIN;
      CREATE TABLE draft_workspaces (
        id TEXT PRIMARY KEY, revision_id TEXT NOT NULL UNIQUE REFERENCES batch_revisions(id),
        payload TEXT NOT NULL
      );
      PRAGMA user_version=4;
      COMMIT;
    `);
    if (version < 5) db.exec(`BEGIN;
      CREATE TABLE draft_validations (
        id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES draft_workspaces(id), payload TEXT NOT NULL
      );
      PRAGMA user_version=5;
      COMMIT;
    `);
    if (version < 6) db.exec(`BEGIN;
      CREATE TABLE draft_reviews (
        id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES draft_workspaces(id),
        validation_id TEXT NOT NULL REFERENCES draft_validations(id), number INTEGER NOT NULL,
        request_id TEXT NOT NULL UNIQUE, request_digest TEXT NOT NULL, payload TEXT NOT NULL,
        UNIQUE(workspace_id, number)
      );
      PRAGMA user_version=6;
      COMMIT;
    `);
    if (version < 7) db.exec(`BEGIN;
      CREATE TABLE data_previews (
        id TEXT PRIMARY KEY, review_id TEXT NOT NULL UNIQUE REFERENCES draft_reviews(id), payload TEXT NOT NULL
      );
      PRAGMA user_version=7;
      COMMIT;
    `);
    if (version < 8) db.exec(`BEGIN;
      CREATE TABLE application_previews (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
      PRAGMA user_version=8;
      COMMIT;
    `);
    if (version < 9) db.exec(`BEGIN;
      CREATE TABLE official_sources (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
      CREATE TABLE official_source_runs (id INTEGER PRIMARY KEY, source_id TEXT NOT NULL, payload TEXT NOT NULL);
      PRAGMA user_version=9;
      COMMIT;
    `);
    if (version < 10) db.exec(`BEGIN;
      CREATE TABLE execution_materials (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
      PRAGMA user_version=10;
      COMMIT;
    `);
    if (version < 11) db.exec(`BEGIN IMMEDIATE;
      CREATE TABLE execution_intents (
        id TEXT PRIMARY KEY, slot TEXT NOT NULL CHECK(slot='isolated_linux_preparation'),
        status TEXT NOT NULL CHECK(status IN ('reserved','needs_reconciliation','cancelled_before_launch')),
        request_id TEXT NOT NULL UNIQUE, material_id TEXT NOT NULL, plan_id TEXT NOT NULL,
        plan_digest TEXT NOT NULL, owner_id TEXT NOT NULL, owner_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL, lease_until INTEGER NOT NULL, updated_at INTEGER NOT NULL, reason TEXT NOT NULL
      );
      CREATE UNIQUE INDEX execution_intents_active_slot ON execution_intents(slot)
        WHERE status IN ('reserved','needs_reconciliation');
      PRAGMA user_version=11;
      COMMIT;
    `);
    if (version < 12) db.exec(`BEGIN IMMEDIATE;
      DROP INDEX execution_intents_active_slot;
      ALTER TABLE execution_intents RENAME TO execution_intents_v11;
      CREATE TABLE execution_intents (
        id TEXT PRIMARY KEY, slot TEXT NOT NULL CHECK(slot='isolated_linux_preparation'),
        status TEXT NOT NULL CHECK(status IN ('reserved','launching','identity_recorded','needs_reconciliation','cancelled_before_launch')),
        request_id TEXT NOT NULL UNIQUE, material_id TEXT NOT NULL, plan_id TEXT NOT NULL,
        plan_digest TEXT NOT NULL, owner_id TEXT NOT NULL, owner_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL, lease_until INTEGER NOT NULL, updated_at INTEGER NOT NULL, reason TEXT NOT NULL,
        runtime_payload TEXT
      );
      INSERT INTO execution_intents SELECT *,NULL FROM execution_intents_v11;
      DROP TABLE execution_intents_v11;
      CREATE UNIQUE INDEX execution_intents_active_slot ON execution_intents(slot)
        WHERE status IN ('reserved','launching','identity_recorded','needs_reconciliation');
      PRAGMA user_version=12;
      COMMIT;
    `);
    if (version < 13) db.exec(`BEGIN IMMEDIATE;
      CREATE INDEX official_source_runs_source_cursor ON official_source_runs(source_id,id DESC);
      PRAGMA user_version=13;
      COMMIT;
    `);
  } catch (error) {
    // Cleanup must not replace the original setup error, even on a damaged database.
    try { if (db.isTransaction) db.exec('ROLLBACK'); } catch {}
    try { db.close(); } catch {}
    throw error;
  }
  let faulted = false;
  const assertHealthy = () => {
    if (faulted) throw new FactError('数据库回滚失败，当前连接已禁止操作；请停止操作并关闭服务，重新打开后核对已保存状态。不会自动重试。', 503);
  };
  const transaction = (action) => {
    assertHealthy();
    db.exec('BEGIN IMMEDIATE');
    try { const result = action(); db.exec('COMMIT'); return result; }
    catch (error) {
      // SQLite may already roll back on FULL/IOERR or an explicit RAISE(ROLLBACK).
      try {
        if (db.isTransaction) db.exec('ROLLBACK');
        if (db.isTransaction) faulted = true;
      } catch { faulted = true; }
      throw error;
    }
  };
  const log = (kind, id) => db.prepare('INSERT INTO events(kind,object_id,created_at) VALUES(?,?,?)')
    .run(kind, id, new Date().toISOString());
  const decode = (row) => row ? JSON.parse(row.payload) : undefined;
  const facts = () => db.prepare('SELECT payload FROM facts ORDER BY created_at DESC, rowid DESC').all().map(decode);
  const reviews = () => db.prepare('SELECT payload FROM fact_reviews ORDER BY rowid DESC').all().map(decode);
  const decodeRevision = (row) => row ? { ...decode(row), invalidatedAt: row.invalidated_at } : undefined;
  const revisions = () => db.prepare('SELECT * FROM batch_revisions ORDER BY rowid DESC').all().map(decodeRevision);
  const sourceSnapshotLookup = (sourceId, digest) => {
    const maxRecords = 2000; const maxBytes = 4 * 1024 * 1024;
    let observed = 0; let bytes = 0;
    // Inspect sizes before selecting payloads; never materialize oversized history bodies.
    const rows = db.prepare('SELECT id, length(CAST(payload AS BLOB)) AS bytes FROM official_source_runs WHERE source_id=? ORDER BY id DESC LIMIT ?').all(sourceId, maxRecords + 1);
    for (const row of rows) {
      if (observed === maxRecords || row.bytes > maxBytes - bytes) {
        return { status: 'budget_exceeded', snapshot: undefined, observed, bytes, maxRecords, maxBytes };
      }
      const payload = db.prepare('SELECT payload FROM official_source_runs WHERE id=? AND source_id=? AND length(CAST(payload AS BLOB))=?').get(row.id, sourceId, row.bytes);
      if (!payload) return { status: 'changed_during_lookup', snapshot: undefined, observed, bytes, maxRecords, maxBytes };
      observed++; bytes += row.bytes;
      const record = decode(payload);
      if (record?.digest === digest && record.lastSuccess) return { status: 'found', snapshot: record, observed, bytes, maxRecords, maxBytes };
    }
    return { status: 'not_found', snapshot: undefined, observed, bytes, maxRecords, maxBytes };
  };
  const store = {
    sourceSnapshotLookup,
    storageHealth: () => storageHealth(db),
    cleanupSnapshot() {
      const tables = { evidence: 'evidence', facts: 'facts', reviews: 'fact_reviews', batches: 'batches', revisions: 'batch_revisions',
        workspaces: 'draft_workspaces', validations: 'draft_validations', draftReviews: 'draft_reviews', dataPreviews: 'data_previews',
        applicationPreviews: 'application_previews', executionMaterials: 'execution_materials', officialSources: 'official_sources', sourceRuns: 'official_source_runs' };
      const records = {}; const coverage = []; let complete = true;
      // SQL projections exclude evidence bodies, diffs, HTML and arbitrary runtime payloads.
      const fields = ['status', 'evidenceId', 'factId', 'batchId', 'revisionId', 'workspaceId', 'validationId', 'reviewId', 'materialId'];
      for (const [kind, table] of Object.entries(tables)) {
        const rows = db.prepare(`SELECT CAST(id AS TEXT) AS id, ${fields.map((field) => `json_extract(payload, '$.${field}') AS ${field}`).join(', ')},
          json_extract(payload, '$.sourceSnapshot.sourceId') AS provenanceSourceId,
          json_extract(payload, '$.sourceSnapshot.digest') AS sourceDigest,
          json_extract(payload, '$.digest') AS digest ${kind === 'sourceRuns' ? ', source_id AS savedSourceId' : ''}
          FROM ${table} ORDER BY rowid DESC LIMIT 2001`).all();
        for (const row of rows) row.sourceId = row.savedSourceId ?? row.provenanceSourceId;
        const truncated = rows.length > 2000; if (truncated) complete = false;
        records[kind] = rows.slice(0, 2000); coverage.push({ kind, observed: records[kind].length, truncated });
      }
      const intents = db.prepare('SELECT id, status, material_id AS materialId FROM execution_intents ORDER BY rowid DESC LIMIT 2001').all();
      records.executionIntents = intents.slice(0, 2000);
      if (intents.length > 2000) complete = false;
      coverage.push({ kind: 'executionIntents', observed: records.executionIntents.length, truncated: intents.length > 2000 });
      const nestedReferences = []; const referenceCoverage = [];
      const targets = { evidenceId: 'evidence', factId: 'facts', batchId: 'batches', revisionId: 'revisions', workspaceId: 'workspaces', validationId: 'validations', reviewId: 'draftReviews', materialId: 'executionMaterials' };
      for (const [kind, table] of Object.entries(tables)) {
        // JSON is traversed inside SQLite; only configured reference scalars enter Node.
        const skipped = db.prepare(`SELECT COUNT(*) AS count FROM (SELECT payload FROM ${table} ORDER BY rowid DESC LIMIT 2000)
          WHERE length(CAST(payload AS BLOB)) > 1048576`).get().count;
        if (skipped) complete = false;
        const edges = db.prepare(`WITH bounded AS MATERIALIZED (SELECT id, payload FROM ${table} ORDER BY rowid DESC LIMIT 2000)
          SELECT CAST(t.id AS TEXT) AS id, j.key, j.fullkey AS path, j.atom AS targetId
          FROM bounded t, json_tree(CASE WHEN length(CAST(t.payload AS BLOB)) <= 1048576 THEN t.payload ELSE '{}' END) j
          WHERE j.key IN ('evidenceId','factId','batchId','revisionId','workspaceId','validationId','reviewId','materialId')
            OR (j.key='id' AND (j.fullkey LIKE '%.confirmedFacts[%].id' OR j.fullkey LIKE '%.factSnapshot[%].id'))
            OR (j.type NOT IN ('array','object') AND j.fullkey LIKE '%.evidenceIds[%]')
          LIMIT 10001`).all();
        const truncated = edges.length > 10000; if (truncated) complete = false;
        for (const edge of edges.slice(0, 10000)) {
          if (edge.targetId == null) continue;
          nestedReferences.push({ kind, id: edge.id, path: edge.path,
            targetKind: targets[edge.key] ?? (edge.key === 'id' ? 'facts' : 'evidence'), targetId: String(edge.targetId) });
        }
        referenceCoverage.push({ kind, observed: Math.min(edges.length, 10000), truncated, skippedOversizedPayloads: skipped,
          recordLimit: 2000, referenceLimit: 10000, payloadByteLimit: 1048576 });
      }
      return { complete, records, coverage, nestedReferences, referenceCoverage };
    },
    executionIntents: executionIntentStore(db, transaction, { now: intentNow }),
    executionMaterials: () => db.prepare('SELECT payload FROM execution_materials ORDER BY rowid DESC').all().map(decode),
    saveExecutionMaterial(record) { db.prepare('INSERT INTO execution_materials VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').run(record.id, JSON.stringify(record)); },
    sourceRecord: (id) => decode(db.prepare('SELECT payload FROM official_sources WHERE id=?').get(id)),
    reconcileSource(id, now) {
      return transaction(() => {
        const record = decode(db.prepare('SELECT payload FROM official_sources WHERE id=?').get(id));
        if (record?.status !== 'collecting' || (record.collectionAttempt && record.collectionAttempt.leaseUntil > now)) return record;
        const reconciled = { ...record, status: 'needs_reconciliation', interruptedAt: new Date(now).toISOString(),
          nextAllowedAt: Math.max(record.nextAllowedAt ?? 0, now + 60000) };
        db.prepare('UPDATE official_sources SET payload=? WHERE id=?').run(JSON.stringify(reconciled), id);
        db.prepare('INSERT INTO official_source_runs(source_id,payload) VALUES(?,?)').run(id, JSON.stringify(reconciled));
        log('source.reconciliation', id); return reconciled;
      });
    },
    beginSourceCollection(id, now) {
      return transaction(() => {
        const before = decode(db.prepare('SELECT payload FROM official_sources WHERE id=?').get(id)) ?? { id };
        if (before.status === 'collecting' || now < (before.nextAllowedAt ?? 0)) throw new FactError('采集进行中或尚在来源冷却期', 409);
        const record = { ...before, id, status: 'collecting', busy: false, lastAttempt: new Date(now).toISOString(), nextAllowedAt: now + 60000,
          collectionAttempt: { id: randomUUID(), leaseUntil: now + 60000 } };
        db.prepare('INSERT INTO official_sources VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').run(id, JSON.stringify(record));
        db.prepare('INSERT INTO official_source_runs(source_id,payload) VALUES(?,?)').run(id, JSON.stringify(record));
        log('source.checked', id); return { before, record };
      });
    },
    finishSourceCollection(id, attemptId, record, now) {
      return transaction(() => {
        const current = decode(db.prepare('SELECT payload FROM official_sources WHERE id=?').get(id));
        if (current?.status !== 'collecting' || current.collectionAttempt?.id !== attemptId || current.collectionAttempt.leaseUntil <= now) {
          throw new FactError('采集尝试已失效，结果不得覆盖当前记录，请刷新核对', 409);
        }
        const completed = { ...record, id, collectionAttempt: { ...current.collectionAttempt, completedAt: new Date(now).toISOString() } };
        db.prepare('UPDATE official_sources SET payload=? WHERE id=?').run(JSON.stringify(completed), id);
        db.prepare('INSERT INTO official_source_runs(source_id,payload) VALUES(?,?)').run(id, JSON.stringify(completed));
        log('source.checked', id);
      });
    },
    sourceHistory(sourceId, { before, status = '', query = '', limit = 10, from = '', until = '' } = {}) {
      for (const date of [from, until]) {
        if (typeof date !== 'string' || (date !== '' && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date))) throw new FactError('Invalid history date');
      }
      if (from && until && from > until) throw new FactError('历史开始日期不能晚于结束日期');
      if (before !== undefined && (!Number.isSafeInteger(before) || before < 1)) throw new FactError('Invalid history cursor');
      if (!Number.isInteger(limit) || limit < 1 || limit > 20 || typeof query !== 'string' || query.length > 100 ||
        !['', 'failed', 'collecting', 'needs_reconciliation', 'access_failed', 'parse_failed', 'success_unchanged', 'success_changed'].includes(status)) throw new FactError('Invalid history filter');
      const rows = db.prepare(sourceHistoryQuery).all(sourceId, before ?? Number.MAX_SAFE_INTEGER, status, status, status, from, from, until, until, query.trim(), query.trim(), query.trim(), limit + 1);
      const hasMore = rows.length > limit; const page = rows.slice(0, limit);
      return { items: page.map(({ id, articles, ...metadata }) => ({ runId: id, ...metadata, articles: JSON.parse(articles) })),
        nextCursor: hasMore ? page.at(-1).id : null, limit, filters: { query: query.trim(), status, from, until },
        dateBasis: 'lastAttempt_UTC_date_inclusive_not_article_date', scope: 'stored_runs_only_not_complete_official_history' };
    },
    sourceHistoryRun(sourceId, id) {
      if (!Number.isSafeInteger(id) || id < 1) throw new FactError('Invalid history ID');
      const row = db.prepare('SELECT payload FROM official_source_runs WHERE source_id=? AND id=?').get(sourceId, id);
      if (!row) throw new FactError('历史记录不存在', 404);
      return { runId: id, record: decode(row), permissions: { autoConfirm: false, execute: false, publish: false } };
    },
    sourceSnapshot(sourceId, digest) {
      return sourceSnapshotLookup(sourceId, digest).snapshot;
    },
    saveSourceRecord(record) { transaction(() => {
      db.prepare('INSERT INTO official_sources VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').run(record.id, JSON.stringify(record));
      db.prepare('INSERT INTO official_source_runs(source_id,payload) VALUES(?,?)').run(record.id, JSON.stringify(record));
      log('source.checked', record.id);
    }); },
    close: () => db.close(),
    evidence: () => db.prepare('SELECT payload FROM evidence ORDER BY created_at DESC, rowid DESC').all().map(decode),
    batches: () => db.prepare('SELECT payload FROM batches ORDER BY created_at DESC, rowid DESC').all().map(decode),
    events: () => db.prepare('SELECT kind, object_id AS objectId, created_at AS createdAt FROM events ORDER BY id DESC LIMIT 50').all(),
    getEvidence: (id) => decode(db.prepare('SELECT payload FROM evidence WHERE id=?').get(id)),
    facts,
    reviews,
    revisions,
    workspaces: () => db.prepare('SELECT payload FROM draft_workspaces ORDER BY rowid DESC').all().map(decode),
    reserveWorkspace(revisionId, build) {
      return transaction(() => {
        const existing = decode(db.prepare('SELECT payload FROM draft_workspaces WHERE revision_id=?').get(revisionId));
        if (existing) return existing;
        if (!db.prepare('SELECT id FROM batch_revisions WHERE id=?').get(revisionId)) throw new FactError('Revision not found', 404);
        const workspace = build();
        db.prepare('INSERT INTO draft_workspaces VALUES(?,?,?)').run(workspace.id, revisionId, JSON.stringify(workspace));
        log('workspace.reserved', workspace.id);
        return workspace;
      });
    },
    updateWorkspace(workspace) {
      db.prepare('UPDATE draft_workspaces SET payload=? WHERE id=?').run(JSON.stringify(workspace), workspace.id);
    },
    validations: () => db.prepare('SELECT payload FROM draft_validations ORDER BY rowid DESC').all().map(decode),
    draftReviews: () => db.prepare('SELECT payload FROM draft_reviews ORDER BY rowid DESC').all().map(decode),
    dataPreviews: () => db.prepare('SELECT payload FROM data_previews ORDER BY rowid DESC').all().map(decode),
    applicationPreviews: () => db.prepare('SELECT payload FROM application_previews ORDER BY rowid DESC').all().map(decode),
    reserveApplicationPreview(record) {
      if (!record || typeof record.id !== 'string' || record.status !== 'starting') throw new FactError('Invalid preview reservation');
      return transaction(() => {
        const occupied = db.prepare(`SELECT id FROM application_previews
          WHERE COALESCE(json_extract(payload,'$.status'), '') NOT IN ('stopped','failed','exited','interrupted') LIMIT 1`).get();
        if (occupied) throw new FactError('同库已有预览占用或待对账；禁止跨实例并发启动', 409);
        db.prepare('INSERT INTO application_previews VALUES(?,?)').run(record.id, JSON.stringify(record));
        return record;
      });
    },
    saveApplicationPreview(record) {
      return transaction(() => {
      const existing = decode(db.prepare('SELECT payload FROM application_previews WHERE id=?').get(record.id));
      if (existing?.ownerInstanceId || record.ownerInstanceId) throw new FactError('带实例归属的预览必须使用归属更新接口', 409);
      db.prepare('INSERT INTO application_previews VALUES(?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload')
        .run(record.id, JSON.stringify(record));
      return record;
      });
    },
    updateOwnedApplicationPreview(record, ownerInstanceId) {
      return transaction(() => {
        const existing = decode(db.prepare('SELECT payload FROM application_previews WHERE id=?').get(record.id));
        if (!existing || !ownerInstanceId || existing.ownerInstanceId !== ownerInstanceId || record.ownerInstanceId !== ownerInstanceId ||
          existing.reviewId !== record.reviewId || existing.packetDigest !== record.packetDigest || existing.workspaceId !== record.workspaceId) {
          throw new FactError('预览实例归属或绑定输入不匹配，禁止覆盖', 409);
        }
        db.prepare('UPDATE application_previews SET payload=? WHERE id=?').run(JSON.stringify(record), record.id);
        return record;
      });
    },
    saveDataPreview(preview) {
      return transaction(() => {
        const existing = decode(db.prepare('SELECT payload FROM data_previews WHERE review_id=?').get(preview.reviewId));
        if (existing) return { preview: existing, duplicate: true };
        db.prepare('INSERT INTO data_previews VALUES(?,?,?)').run(preview.id, preview.reviewId, JSON.stringify(preview));
        log('draft.data_previewed', preview.id);
        return { preview, duplicate: false };
      });
    },
    findDraftReviewRequest(requestId, requestDigest) {
      const row = db.prepare('SELECT * FROM draft_reviews WHERE request_id=?').get(requestId);
      if (row && row.request_digest !== requestDigest) throw new FactError('请求标识已用于不同草案审核', 409);
      return decode(row);
    },
    saveDraftReview(input, packet, requestDigest) {
      return transaction(() => {
        const existing = db.prepare('SELECT * FROM draft_reviews WHERE request_id=?').get(input.requestId);
        if (existing) {
          if (existing.request_digest !== requestDigest) throw new FactError('请求标识已用于不同草案审核', 409);
          return { review: decode(existing), duplicate: true };
        }
        const latest = db.prepare('SELECT COALESCE(MAX(number),0) AS number FROM draft_reviews WHERE workspace_id=?').get(packet.workspaceId).number;
        if (latest !== input.expectedLatest) throw new FactError('草案已有新审核，请重新加载审核材料', 409);
        const review = { ...input, id: randomUUID(), number: latest + 1, workspaceId: packet.workspaceId,
          validationId: packet.validation.id, revisionId: packet.revisionId, packetDigest: packet.digest,
          snapshot: packet, createdAt: new Date().toISOString(), capabilities: { commit: false, publish: false } };
        db.prepare('INSERT INTO draft_reviews VALUES(?,?,?,?,?,?,?)').run(review.id, review.workspaceId, review.validationId,
          review.number, input.requestId, requestDigest, JSON.stringify(review));
        log(`draft.${review.decision}`, review.id);
        return { review, duplicate: false };
      });
    },
    saveValidation(report) {
      return transaction(() => {
        db.prepare('INSERT INTO draft_validations VALUES(?,?,?)').run(report.id, report.workspaceId, JSON.stringify(report));
        log('draft.validated', report.id);
        return report;
      });
    },
    getRevision: (id) => decodeRevision(db.prepare('SELECT * FROM batch_revisions WHERE id=?').get(id)),
    createRevision(raw, context) {
      const input = validateRevision(raw);
      return transaction(() => {
        const requestDigest = fingerprint(input);
        const existing = db.prepare('SELECT * FROM batch_revisions WHERE request_id=?').get(input.requestId);
        if (existing) {
          if (existing.request_digest !== requestDigest) throw new FactError('请求标识已用于不同修订', 409);
          return { revision: decodeRevision(existing), duplicate: true };
        }
        const batch = decode(db.prepare('SELECT payload FROM batches WHERE id=?').get(input.batchId));
        if (!batch) throw new FactError('Batch not found', 404);
        if (batch.lifecycle?.status === 'closed_no_update') throw new FactError('任务已结束，不能创建修订', 409);
        const latest = db.prepare('SELECT COALESCE(MAX(number),0) AS number FROM batch_revisions WHERE batch_id=?').get(batch.id).number;
        if (input.expectedLatest !== latest) throw new FactError('任务已有新修订，请刷新后重试', 409);
        const selected = input.selectedFacts.map((item) => {
          const fact = decode(db.prepare('SELECT payload FROM facts WHERE id=?').get(item.id));
          if (!fact || fact.evidenceId !== batch.evidenceId || fact.status !== 'confirmed' || fact.revision !== item.revision) {
            throw new FactError('选定事实不属于此任务、未确认或审核版本已变化', 409);
          }
          return fact;
        });
        const snapshot = { gameId: batch.gameId, evidenceId: batch.evidenceId, title: batch.title,
          confirmedFacts: selected, baseline: context.baseline, contentFingerprint: context.index.fingerprint,
          deployment: context.index.deployment, checks: context.index.findings,
          allowedPaths: batch.allowedPaths, protectedPaths: batch.protectedPaths,
          requirements: batch.requirements, capabilities: { edit: false, publish: false } };
        const revision = { id: randomUUID(), batchId: batch.id, number: latest + 1,
          parentRevisionId: revisions().find((item) => item.batchId === batch.id)?.id ?? null,
          note: input.note, createdAt: new Date().toISOString(), snapshot, snapshotDigest: fingerprint(snapshot) };
        db.prepare('INSERT INTO batch_revisions VALUES(?,?,?,?,?,?,NULL)').run(revision.id, batch.id, revision.number,
          input.requestId, requestDigest, JSON.stringify(revision));
        log('batch.revised', revision.id);
        return { revision: { ...revision, invalidatedAt: null }, duplicate: false };
      });
    },
    createFact(input) {
      return transaction(() => {
        const evidence = decode(db.prepare('SELECT payload FROM evidence WHERE id=?').get(typeof input?.evidenceId === 'string' ? input.evidenceId : ''));
        const validated = validateFact(input, evidence);
        const fingerprint = createHash('sha256').update(JSON.stringify(validated)).digest('hex');
        const existing = decode(db.prepare('SELECT payload FROM facts WHERE fingerprint=?').get(fingerprint));
        if (existing) return { fact: existing, duplicate: true };
        const fact = { ...validated, id: randomUUID(), fingerprint, revision: 0, status: 'needs_review', createdAt: new Date().toISOString() };
        db.prepare('INSERT INTO facts VALUES(?,?,?,?,?)').run(fact.id, fact.evidenceId, fingerprint, JSON.stringify(fact), fact.createdAt);
        log('fact.created', fact.id);
        return { fact, duplicate: false };
      });
    },
    reviewFact(input) {
      return transaction(() => {
        const fact = decode(db.prepare('SELECT payload FROM facts WHERE id=?').get(typeof input?.factId === 'string' ? input.factId : ''));
        const validated = validateReview(input, fact);
        const review = { ...validated, id: randomUUID(), factId: fact.id, factFingerprint: fact.fingerprint,
          revision: fact.revision + 1, createdAt: new Date().toISOString() };
        const updated = { ...fact, status: review.decision, revision: review.revision };
        db.prepare('INSERT INTO fact_reviews VALUES(?,?,?,?)').run(review.id, fact.id, review.revision, JSON.stringify(review));
        db.prepare('UPDATE facts SET payload=? WHERE id=?').run(JSON.stringify(updated), fact.id);
        for (const revision of revisions()) {
          if (!revision.invalidatedAt && revision.snapshot.confirmedFacts.some((item) => item.id === fact.id)) {
            db.prepare('UPDATE batch_revisions SET invalidated_at=? WHERE id=?').run(review.createdAt, revision.id);
            log('batch.revision_invalidated', revision.id);
          }
        }
        log(`fact.${review.decision}`, fact.id);
        return { fact: updated, review };
      });
    },
    importEvidence(input) {
      // Publication time and scope are part of identity; edits to the body create a new snapshot.
      const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');
      return transaction(() => {
        const existing = decode(db.prepare('SELECT payload FROM evidence WHERE fingerprint=?').get(fingerprint));
        if (existing) return { evidence: existing, duplicate: true };
        const evidence = { ...input, id: randomUUID(), fingerprint, verification: 'unverified',
          importMethod: input.sourceSnapshot ? 'reviewed_official_excerpt' : 'manual', createdAt: new Date().toISOString() };
        db.prepare('INSERT INTO evidence VALUES(?,?,?,?)').run(evidence.id, fingerprint, JSON.stringify(evidence), evidence.createdAt);
        log('evidence.imported', evidence.id);
        return { evidence, duplicate: false };
      });
    },
    closeBatch(raw, context) {
      const input = validateBatchClosure(raw);
      return transaction(() => {
        const batch = decode(db.prepare('SELECT payload FROM batches WHERE id=?').get(input.batchId));
        if (!batch) throw new FactError('Batch not found', 404);
        const digest = fingerprint(input);
        const previous = batch.lifecycle?.closure;
        if (previous) {
          if (previous.requestId === input.requestId && previous.requestDigest === digest) return { batch, duplicate: true };
          throw new FactError('任务已结束；重复请求内容冲突或需重新评估', 409);
        }
        if (db.prepare('SELECT 1 FROM batch_revisions WHERE batch_id=? LIMIT 1').get(batch.id)) {
          throw new FactError('已有修订的任务不能按无需更新结束，请先独立处理草案', 409);
        }
        const currentFacts = facts().filter((fact) => fact.evidenceId === batch.evidenceId);
        if (!currentFacts.length || currentFacts.some((fact) => fact.status !== 'confirmed')) {
          throw new FactError('需要先确认此证据的全部已记录事实', 409);
        }
        const coverage = closureCoverage(context.index);
        if (coverage.status !== 'ready') {
          throw new FactError('HI3四类源数据/公共镜像读取或一致性检查未通过，不能记录无需更新；请先处理扫描失败项。未覆盖检查不等于通过。', 409);
        }
        if (!context.baseline.commit || input.contextDigest !== batchContext(batch, currentFacts, context.index, context.baseline)) {
          throw new FactError('任务、事实、内容或代码上下文已变化，请刷新后核对', 409);
        }
        batch.lifecycle = { status: 'closed_no_update', closure: { ...input, requestDigest: digest,
          createdAt: new Date().toISOString(), evidenceId: batch.evidenceId,
          facts: currentFacts.map(({ id, revision }) => ({ id, revision })),
          contentFingerprint: context.index.fingerprint, baseline: context.baseline, coverage,
          permissions: { edit: false, publish: false } } };
        db.prepare('UPDATE batches SET payload=? WHERE id=?').run(JSON.stringify(batch), batch.id);
        log('batch.closed_no_update', batch.id);
        return { batch, duplicate: false };
      });
    },
    createBatch(evidenceId, build) {
      return transaction(() => {
        const existing = decode(db.prepare('SELECT payload FROM batches WHERE evidence_id=?').get(evidenceId));
        if (existing) return { batch: existing, duplicate: true };
        const evidence = decode(db.prepare('SELECT payload FROM evidence WHERE id=?').get(evidenceId));
        if (!evidence) throw new Error('Evidence not found');
        const batch = { ...build(evidence, facts().filter((fact) => fact.evidenceId === evidenceId)), id: randomUUID(), evidenceId, createdAt: new Date().toISOString() };
        db.prepare('INSERT INTO batches VALUES(?,?,?,?)').run(batch.id, evidenceId, JSON.stringify(batch), batch.createdAt);
        log('batch.created', batch.id);
        return { batch, duplicate: false };
      });
    },
  };
  // Guard invocation, not property access, so previously captured methods stay fenced.
  const guard = (api) => Object.fromEntries(Object.entries(api).map(([key, value]) => [key,
    typeof value === 'function' ? (...args) => { assertHealthy(); return value(...args); } : value]));
  return { ...guard(store), executionIntents: guard(store.executionIntents), close: store.close };
}
