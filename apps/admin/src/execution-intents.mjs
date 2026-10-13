import { createHash, randomUUID } from 'node:crypto';
import { FactError } from './facts.mjs';
import { compareRuntimeObservation, runtimeInspectionContract } from './runtime-inspection.mjs';
import { runtimeInspectCommands, parseRuntimeInspectResults } from './runtime-inspect-adapter.mjs';
import { simulateInspectionSession } from './runtime-inspect-session.mjs';

const sha = (value) => createHash('sha256').update(value).digest('hex');
const slot = 'isolated_linux_preparation';

// Only a future trusted adapter calls this store API. No HTTP reservation API exists.
export function executionIntentStore(db, transaction, { now: clock = Date.now } = {}) {
  const now = () => {
    const value = clock();
    if (!Number.isSafeInteger(value) || value < 0 || value > Number.MAX_SAFE_INTEGER - 60000) throw new FactError('Invalid execution intent clock', 409);
    return value;
  };
  const read = (id) => db.prepare('SELECT * FROM execution_intents WHERE id=?').get(id);
  const runtime = (row) => row.runtime_payload ? JSON.parse(row.runtime_payload) : null;
  const publicRecord = (row) => ({ id: row.id, slot: row.slot, status: row.status,
    materialId: row.material_id, planId: row.plan_id, planDigest: row.plan_digest,
    ownerInstanceId: row.owner_id, createdAt: row.created_at, leaseUntil: row.lease_until,
    updatedAt: row.updated_at, reason: row.reason,
    runtimeIdentity: runtime(row) ? (({ ownershipHash, ...identity }) => identity)(runtime(row)) : null,
    // A recorded launch attempt is not proof that a runtime was created or absent.
    runtimeCreated: runtime(row) ? null : false,
    identityVerified: false, capabilities: { prepare: false, execute: false, publish: false } });
  function recover(time) {
    db.prepare(`UPDATE execution_intents SET status='needs_reconciliation', reason='lease_expired_no_takeover', updated_at=?
      WHERE status IN ('reserved','launching','identity_recorded') AND lease_until<=?`).run(time, time);
  }
  function owner(input) {
    if (typeof input?.ownerInstanceId !== 'string' || !/^[a-zA-Z0-9_-]{8,100}$/.test(input.ownerInstanceId) ||
      typeof input.ownerNonce !== 'string' || !/^[a-f0-9]{64}$/.test(input.ownerNonce)) throw new FactError('Invalid internal intent owner');
    return sha(input.ownerNonce);
  }
  function ttl(input) {
    if (!Number.isInteger(input.leaseMs) || input.leaseMs < 1000 || input.leaseMs > 60000) throw new FactError('Lease must be 1000..60000ms');
    return input.leaseMs;
  }
  function owned(input, time, statuses = ['reserved']) {
    const hash = owner(input); const row = read(input.id);
    if (!row) throw new FactError('执行意图不存在', 404);
    if (row.owner_id !== input.ownerInstanceId || row.owner_hash !== hash) throw new FactError('执行意图归属不匹配', 409);
    if (!statuses.includes(row.status) || row.lease_until <= time) throw new FactError('执行意图已失效或状态不允许，必须对账；禁止自动释放或接管', 409);
    return row;
  }
  return {
    simulateInspection(input) {
      if (typeof input?.id !== 'string') throw new FactError('Intent ID required');
      const row = read(input.id);
      if (!row) throw new FactError('执行意图不存在', 404);
      const view = (record) => record ? { ...record, leaseUntil: record.lease_until } : null;
      return simulateInspectionSession({ ...input, snapshot: view(row), readSnapshot: () => view(read(input.id)), now,
        expected: { ...runtime(row), intentId: row.id, ownerInstanceId: row.owner_id, planDigest: row.plan_digest } });
    },
    inspectProfile(input) {
      if (typeof input?.id !== 'string') throw new FactError('Intent ID required');
      const row = read(input.id);
      if (!row) throw new FactError('执行意图不存在', 404);
      return runtimeInspectCommands(runtime(row) ?? {}, input.executable);
    },
    compareInspectResults(input) {
      if (typeof input?.id !== 'string') throw new FactError('Intent ID required');
      const row = read(input.id);
      if (!row) throw new FactError('执行意图不存在', 404);
      return parseRuntimeInspectResults({ ...runtime(row), intentId: row.id, ownerInstanceId: row.owner_id, planDigest: row.plan_digest },
        input.containerResult, input.imageResult, { startedAt: input.startedAt, finishedAt: input.finishedAt, now: now() });
    },
    inspectionContract(input) {
      if (typeof input?.id !== 'string') throw new FactError('Intent ID required');
      const row = read(input?.id);
      if (!row) throw new FactError('执行意图不存在', 404);
      const record = publicRecord(row);
      if (['reserved', 'launching', 'identity_recorded'].includes(record.status) && record.leaseUntil <= now()) record.status = 'needs_reconciliation';
      return runtimeInspectionContract(record);
    },
    compareObservation(input) {
      if (typeof input?.id !== 'string') throw new FactError('Intent ID required');
      const row = read(input?.id);
      if (!row) throw new FactError('执行意图不存在', 404);
      const identity = runtime(row);
      return compareRuntimeObservation({ ...identity, intentId: row.id, ownerInstanceId: row.owner_id, planDigest: row.plan_digest }, input.observation, now());
    },
    list: () => transaction(() => {
      recover(now());
      return db.prepare('SELECT * FROM execution_intents ORDER BY rowid DESC').all().map(publicRecord);
    }),
    reserve(input) {
      const hash = owner(input); const duration = ttl(input);
      for (const key of ['materialId', 'planId', 'requestId']) {
        if (typeof input[key] !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(input[key])) throw new FactError(`Invalid intent ${key}`);
      }
      if (!/^[a-f0-9]{64}$/.test(input.planDigest ?? '')) throw new FactError('Invalid intent plan digest');
      // Commit recovery even when reservation will be denied; expired owners keep the slot.
      transaction(() => recover(now()));
      return transaction(() => {
        const time = now();
        const existing = db.prepare('SELECT * FROM execution_intents WHERE request_id=?').get(input.requestId);
        if (existing) {
          if (existing.owner_id !== input.ownerInstanceId || existing.owner_hash !== hash || existing.material_id !== input.materialId ||
            existing.plan_id !== input.planId || existing.plan_digest !== input.planDigest) throw new FactError('执行意图请求ID冲突', 409);
          return { intent: publicRecord(existing), duplicate: true };
        }
        if (db.prepare("SELECT id FROM execution_intents WHERE status IS NULL OR status <> 'cancelled_before_launch'").get()) throw new FactError('执行槽已占用、未知或待对账，禁止接管', 409);
        const id = randomUUID();
        db.prepare(`INSERT INTO execution_intents
          (id,slot,status,request_id,material_id,plan_id,plan_digest,owner_id,owner_hash,created_at,lease_until,updated_at,reason)
          VALUES(?,?,'reserved',?,?,?,?,?,?,?,?,?,?)`)
          .run(id, slot, input.requestId, input.materialId, input.planId, input.planDigest, input.ownerInstanceId, hash,
            time, time + duration, time, 'control_plane_only_no_runtime');
        return { intent: publicRecord(read(id)), duplicate: false };
      });
    },
    heartbeat(input) {
      const duration = ttl(input);
      transaction(() => recover(now()));
      return transaction(() => {
        const time = now(); const row = owned(input, time, ['reserved', 'launching', 'identity_recorded']);
        db.prepare('UPDATE execution_intents SET lease_until=?,updated_at=? WHERE id=?').run(time + duration, time, row.id);
        return publicRecord(read(row.id));
      });
    },
    beginLaunch(input) {
      if (!['docker', 'podman'].includes(input.runtimeKind) ||
        typeof input.image !== 'string' || input.image.length > 300 || !/^[a-z0-9][a-z0-9.-]*(?::[0-9]{1,5})?\/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$/.test(input.image) || input.image.includes('..') || input.image.includes('//') ||
        !['linux/arm64', 'linux/amd64'].includes(input.platform) || !/^[a-f0-9]{64}$/.test(input.runtimeOwnershipNonce ?? '')) throw new FactError('Invalid launch identity');
      transaction(() => recover(now()));
      return transaction(() => {
        const time = now(); const row = owned(input, time);
        const identity = { launchAttemptId: randomUUID(), runtimeKind: input.runtimeKind, image: input.image,
          platform: input.platform, ownershipHash: sha(input.runtimeOwnershipNonce), instanceId: null,
          outcome: 'unknown', declaredAt: time };
        db.prepare("UPDATE execution_intents SET status='launching',runtime_payload=?,updated_at=?,reason='launch_intent_persisted_no_verified_runtime' WHERE id=?")
          .run(JSON.stringify(identity), time, row.id);
        return publicRecord(read(row.id));
      });
    },
    recordLaunchResult(input) {
      if (!['identity_reported', 'unknown'].includes(input.outcome)) throw new FactError('启动结果仅接受身份声明或未知');
      if (input.outcome === 'identity_reported' && (typeof input.instanceId !== 'string' || !/^[a-f0-9]{64}$/.test(input.instanceId))) throw new FactError('必须使用完整不可变实例ID，不接受名称或短ID');
      transaction(() => recover(now()));
      return transaction(() => {
        const time = now(); const row = owned(input, time, ['launching', 'identity_recorded']); const identity = runtime(row);
        if (!identity || identity.launchAttemptId !== input.launchAttemptId || identity.ownershipHash !== sha(input.runtimeOwnershipNonce ?? '') ||
          identity.runtimeKind !== input.runtimeKind || identity.image !== input.image || identity.platform !== input.platform) throw new FactError('启动尝试或实例身份不匹配', 409);
        if (row.status === 'identity_recorded') {
          if (input.outcome === 'identity_reported' && identity.instanceId === input.instanceId) return publicRecord(row);
          throw new FactError('不得覆写已记录实例身份', 409);
        }
        identity.outcome = input.outcome;
        identity.instanceId = input.outcome === 'identity_reported' ? input.instanceId : null;
        identity.reportedAt = time;
        db.prepare('UPDATE execution_intents SET status=?,runtime_payload=?,updated_at=?,reason=? WHERE id=?')
          .run(input.outcome === 'identity_reported' ? 'identity_recorded' : 'needs_reconciliation', JSON.stringify(identity), time,
            input.outcome === 'identity_reported' ? 'reported_identity_not_verified' : 'launch_outcome_unknown_no_release', row.id);
        return publicRecord(read(row.id));
      });
    },
    cancelBeforeLaunch(input) {
      transaction(() => recover(now()));
      return transaction(() => {
        const time = now(); const row = owned(input, time);
        db.prepare("UPDATE execution_intents SET status='cancelled_before_launch',updated_at=?,reason='owner_cancelled_control_plane_only' WHERE id=?").run(time, row.id);
        return publicRecord(read(row.id));
      });
    },
  };
}
