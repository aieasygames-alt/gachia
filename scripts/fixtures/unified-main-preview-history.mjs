import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { digest } from '../desktop-release-assets.mjs';
import { exactUnifiedPreviewOrigin, unifiedHTMLParserPin } from '../unified-version-preview.mjs';

// Synthetic history for exercising real readers, never a cloud upload receipt.
export function sealUnifiedMainPreviewHistory({ run, directory, value, accepted, versions, save, networkPin = 'a'.repeat(64) }) {
  const { releaseKey, transportPin, baseline } = value, old = join(run, `unified-cloud-preview-${transportPin}`);
  const recovery = accepted.recovery.main, candidate = accepted.candidate.main;
  const journal = (file, rows, extra = {}) => {
    const raw = rows.map(row => JSON.stringify({ at: new Date().toISOString(), releaseKey, transportPin, ...extra, ...row })).join('\n') + '\n';
    writeFileSync(file, raw); return { path: file, pin: digest(raw) };
  };
  mkdirSync(join(old, 'recovery-main/http'), { recursive: true });
  const original = journal(join(run, `unified-preview-${transportPin}.jsonl`), [
    { phase: 'baseline', directory: old, baseline },
    { phase: 'upload_intent', owner: 'main', role: 'recovery', service: 'gachia', moduleSHA256: recovery.moduleSHA256 },
    { phase: 'upload_response', owner: 'main', role: 'recovery', service: 'gachia', versionId: recovery.versionId },
    { phase: 'upload_returned', owner: 'main', role: 'recovery', service: 'gachia', versionId: recovery.versionId },
    { phase: 'stopped', pendingOperation: { owner: 'main', role: 'recovery', service: 'gachia', versionId: recovery.versionId },
      uploaded: { recovery: { gachia: { versionId: recovery.versionId } } }, accepted: { recovery: {} }, error: 'fetch failed', automaticRetry: false, automaticRollback: false },
    { phase: 'read_only_reconciliation', snapshot: baseline,
      recovery: { status: 'baseline_active', drift: [], cloudWrites: false, owners: { gachia: {} } },
      candidate: { status: 'baseline_active', drift: [], cloudWrites: false, owners: {} } },
  ]);
  const stop = { journal: original, module: recovery.moduleProof,
    version: save(join(old, 'recovery-main/version.json'), versions.recovery),
    http: save(join(old, 'recovery-main/http/result.json'), { schemaVersion: 1, kind: 'unified_exact_version_preview', status: 'failed',
      service: 'gachia', versionId: recovery.versionId, origin: exactUnifiedPreviewOrigin('gachia', recovery.versionId),
      observationMode: 'cloud_exact_version', parserPin: unifiedHTMLParserPin(), observations: [], error: 'fetch failed' }) };
  const stopPin = digest(JSON.stringify(Object.fromEntries(Object.keys(stop).sort().map(key => [key, { path: stop[key].path, pin: stop[key].pin }]))));
  const completed = journal(join(run, `unified-preview-completion-${transportPin}.jsonl`), [
    { phase: 'baseline', directory, baseline, stop },
    { phase: 'existing_recovery_observation_intent', versionId: recovery.versionId },
    { phase: 'existing_recovery_preview_accepted', proof: recovery },
    { phase: 'upload_intent', owner: 'main', role: 'candidate', service: 'gachia', moduleSHA256: candidate.moduleSHA256 },
    { phase: 'upload_response', versionId: candidate.versionId },
    { phase: 'candidate_preview_accepted', proof: candidate },
    { phase: 'all_cloud_previews_accepted_no_promotion', accepted },
  ], { stopPin });
  const receipt = { schemaVersion: 1, kind: 'unified_completed_observation_stop_cloud_previews', status: 'all_cloud_previews_accepted_no_promotion',
    releaseKey, transportPin, stop, stopPin, networkPin, journalPin: completed.pin, accepted,
    productionPromoted: false, activationSupported: false };
  return { directory, receipt, pin: save(join(directory, 'receipt.json'), receipt).pin };
}
