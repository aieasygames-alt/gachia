import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { reconcileRelease } from '../desktop-cloud-release.mjs';
import { digest } from '../desktop-release-assets.mjs';
import { unifiedUploadedPairStopPin } from '../unified-preview-completion.mjs';

// Convert an isolated accepted-preview fixture into the two-upload interruption
// and its later read-only completion. Never used by production entry points.
export function uploadedPairHistoryFixture(f, networkPin, { continued = false } = {}) {
  const { run, value } = f.input, transportPin = value.transportPin;
  const root = path.join(run, `unified-cloud-preview-${transportPin}`);
  let directory = path.join(run, `unified-cloud-uploaded-pair-completion-${transportPin}`);
  const accepted = structuredClone(f.input.previews.receipt.accepted), stop = {}, uploaded = {};
  const at = new Date().toISOString(), common = { at, releaseKey: value.releaseKey, transportPin };
  const rows = [{ ...common, phase: 'baseline', baseline: value.baseline, directory: root }];
  const pin = file => ({ path: file, pin: digest(readFileSync(file)) });
  for (const role of ['recovery', 'candidate']) {
    const original = path.join(root, `${role}-main`), fresh = path.join(directory, `${role}-main`);
    cpSync(path.join(f.input.previews.directory, `${role}-main`), original, { recursive: true });
    mkdirSync(path.join(original, 'module'), { recursive: true });
    const moduleBytes = readFileSync(accepted[role].main.moduleProof.path);
    writeFileSync(path.join(original, 'module/receipt.json'), moduleBytes);
    stop[role] = { http: pin(path.join(original, 'http/result.json')), version: pin(path.join(original, 'version.json')),
      module: pin(path.join(original, 'module/receipt.json')) };
    accepted[role].main.moduleProof = stop[role].module;
    accepted[role].main.acceptedAt = Date.parse(at);
    uploaded[role] = { gachia: { versionId: accepted[role].main.versionId } };
    for (const phase of ['upload_intent', 'upload_response', 'upload_returned']) rows.push({ ...common, phase, owner: 'main', role,
      service: 'gachia', ...(phase === 'upload_intent' ? { moduleSHA256: accepted[role].main.moduleSHA256 } : { versionId: accepted[role].main.versionId }) });
    if (role === 'recovery') rows.push({ ...common, phase: 'preview_accepted', owner: 'main', role, proof: accepted[role].main });
    cpSync(original, fresh, { recursive: true });
  }
  const pendingOperation = { role: 'candidate', owner: 'main', service: 'gachia', versionId: accepted.candidate.main.versionId };
  rows.push({ ...common, phase: 'stopped', uploaded, accepted: { recovery: accepted.recovery, candidate: {} }, pendingOperation,
    error: 'Next-batch source handoff expired; take fresh read-only observations', automaticRetry: false, automaticRollback: false },
  { ...common, phase: 'read_only_reconciliation', pendingOperation, snapshot: value.baseline,
    recovery: reconcileRelease(value.baseline, value.baseline, uploaded.recovery), candidate: reconcileRelease(value.baseline, value.baseline, uploaded.candidate) });
  const journal = path.join(run, `unified-preview-${transportPin}.jsonl`);
  writeFileSync(journal, rows.map(JSON.stringify).join('\n') + '\n'); stop.journal = pin(journal);
  const stopPin = unifiedUploadedPairStopPin(stop), base = { ...common, stopPin };
  const completed = [{ ...base, phase: 'baseline', directory, stop, networkPin, baseline: value.baseline }];
  for (const role of ['recovery', 'candidate']) completed.push({ ...base, phase: 'observation_intent', role, versionId: accepted[role].main.versionId },
    { ...base, phase: 'preview_accepted', role, proof: accepted[role].main });
  completed.push({ ...base, phase: 'all_cloud_previews_accepted_no_promotion', accepted });
  let completionJournal = path.join(run, `unified-uploaded-pair-completion-${transportPin}.jsonl`);
  let ancestry = {};
  if (continued) {
    const stopped = [...completed.slice(0, 4), { ...base, phase: 'stopped', accepted: { recovery: accepted.recovery, candidate: {} },
      error: 'spawnSync python3 ETIMEDOUT', cloudWrites: false, automaticRetry: false, automaticRollback: false }];
    writeFileSync(completionJournal, stopped.map(JSON.stringify).join('\n') + '\n');
    ancestry = { completionStop: { journal: pin(completionJournal), recovery: pin(path.join(directory, 'recovery-main/http/result.json')),
      candidate: pin(path.join(directory, 'candidate-main/http/result.json')) } };
    cpSync(directory, directory + '-continued', { recursive: true });
    directory += '-continued';
    completionJournal = path.join(run, `unified-uploaded-pair-completion-${transportPin}-continued.jsonl`);
    completed[0].directory = directory;
    for (const row of completed) Object.assign(row, ancestry);
  }
  writeFileSync(completionJournal, completed.map(JSON.stringify).join('\n') + '\n');
  const receipt = { schemaVersion: 1, kind: 'unified_readonly_uploaded_pair_cloud_previews', status: 'all_cloud_previews_accepted_no_promotion',
    releaseKey: value.releaseKey, transportPin, stop, stopPin, networkPin, ...ancestry, accepted, journalPin: pin(completionJournal).pin,
    cloudWrites: false, productionPromoted: false, activationSupported: false };
  const proof = f.save(path.join(directory, 'receipt.json'), receipt);
  return { directory, receipt, proof };
}
