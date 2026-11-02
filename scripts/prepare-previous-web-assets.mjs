import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stripVTControlCharacters } from 'node:util';
import { retainWebAssets, verifyRetainedWebAssets } from './retain-web-assets.mjs';
import { verifyRecoveryArtifact, verifyRecoveryReceipt } from './web-recovery-policy.mjs';

const repository = 'aieasygames-alt/gachia';
export function previousArtifactInput(env) {
  const { PREVIOUS_WEB_ARTIFACT_ID: artifactId, PREVIOUS_WEB_ARTIFACT_SHA256: archiveSha256, ROLLBACK_VERSION: versionId } = env;
  assert(/^[1-9][0-9]*$/.test(artifactId ?? ''), 'Previous web artifact ID required');
  assert(/^[a-f0-9]{64}$/.test(archiveSha256 ?? ''), 'Previous archive SHA-256 required');
  assert(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(versionId ?? ''), 'Rollback version UUID required');
  return { artifactId, archiveSha256, versionId };
}

export function verifyPreviousArtifact(metadata, input) {
  assert.equal(String(metadata.id), input.artifactId);
  assert.equal(metadata.expired, false, 'Previous artifact expired');
  assert.equal(metadata.digest, `sha256:${input.archiveSha256}`, 'Previous artifact digest drift');
  const run = metadata.workflow_run;
  assert(run && run.head_branch === 'main' && run.repository_id === 1229333607 && run.repository_id === run.head_repository_id, 'Previous artifact must belong to a trusted main run');
  assert(/^[a-f0-9]{40}$/.test(run.head_sha), 'Invalid previous source commit');
  assert(new RegExp(`^web-worker-${run.head_sha}-[1-9][0-9]*$`).test(metadata.name), 'Unexpected previous artifact name');
  assert(metadata.size_in_bytes > 0 && metadata.size_in_bytes <= 128 * 1024 * 1024, 'Previous artifact download budget exceeded');
  assert(Number.isSafeInteger(run.id) && run.id > 0);
  return run.id;
}

export function verifyPreviousDeploymentLog(log, input) {
  assert(new RegExp(`artifact-ids:\\s*${input.artifactId}(?:\\s|$)`).test(log), 'Previous deployment did not select this immutable artifact ID');
  assert(new RegExp(`Current Version ID: ${input.versionId}(?:\\s|$)`).test(log), 'Previous deployment log does not identify the active rollback version');
}

export function createPreviousArtifactApi(exec = execFileSync) {
  let allowMachineEscapes;
  return (path, binary = false) => {
    assert(/^(?:actions\/artifacts\/[1-9][0-9]*(?:\/zip)?|actions\/runs\/[1-9][0-9]*(?:\/jobs\?per_page=100)?|actions\/jobs\/[1-9][0-9]*\/logs)$/.test(path), 'Unsupported previous artifact API path');
    assert.equal(binary, path.endsWith('/zip'), 'Binary mode is only valid and required for the artifact ZIP');
    const machinePayload = binary || path.endsWith('/logs');
    if (machinePayload && allowMachineEscapes === undefined) {
      const help = exec('gh', ['api', '--help'], { encoding: 'utf8', maxBuffer: 1024 * 1024, timeout: 15000 });
      allowMachineEscapes = /--allow-escape-sequences\b/.test(help);
    }
    // New gh protects terminal output; these payloads stay in pipes, never a terminal.
    const flags = machinePayload && allowMachineEscapes ? ['--allow-escape-sequences'] : [];
    const response = exec('gh', ['api', ...flags, `/repos/${repository}/${path}`], {
      encoding: binary ? undefined : 'utf8', maxBuffer: 128 * 1024 * 1024, timeout: binary ? 300000 : 180000,
    });
    return path.endsWith('/logs') ? stripVTControlCharacters(response) : response;
  };
}

export function capturePreviousWebAssets({ input, recoveryInput = {}, directory, api = createPreviousArtifactApi() }) {
  previousArtifactInput({ PREVIOUS_WEB_ARTIFACT_ID: input.artifactId, PREVIOUS_WEB_ARTIFACT_SHA256: input.archiveSha256, ROLLBACK_VERSION: input.versionId });
  mkdirSync(directory, { mode: 0o700 });
  const metadata = JSON.parse(api(`actions/artifacts/${input.artifactId}`));
  const runId = verifyPreviousArtifact(metadata, input);
  const jobs = JSON.parse(api(`actions/runs/${runId}/jobs?per_page=100`)).jobs;
  const deploy = jobs.filter(job => job.name === 'deploy');
  assert.equal(deploy.length, 1, 'One previous production deployment required');
  let recovery;
  if (deploy[0].conclusion !== 'success') {
    const id = recoveryInput.artifactId;
    const sha256 = recoveryInput.archiveSha256;
    assert(/^[1-9][0-9]*$/.test(id ?? '') && /^[a-f0-9]{64}$/.test(sha256 ?? ''), 'Failed source job requires an immutable successful read-only recovery receipt');
    const recoveryMetadata = JSON.parse(api(`actions/artifacts/${id}`));
    assert(recoveryMetadata.workflow_run?.id, 'Missing recovery run');
    const recoveryRun = JSON.parse(api(`actions/runs/${recoveryMetadata.workflow_run.id}`));
    verifyRecoveryArtifact({ metadata: recoveryMetadata, run: recoveryRun, input: { recoveryArtifactId: id, recoverySha256: sha256 } });
    const recoveryJobs = JSON.parse(api(`actions/runs/${recoveryMetadata.workflow_run.id}/jobs?per_page=100`)).jobs;
    const archive = api(`actions/artifacts/${id}/zip`, true);
    assert.equal(createHash('sha256').update(archive).digest('hex'), sha256, 'Recovery ZIP digest mismatch');
    // Only deserialize the bounded JSON receipt; never execute files from this archive.
    const receipt = JSON.parse(execFileSync('python3', ['-c',
      'import io,json,sys,zipfile; z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())); assert z.namelist()==["receipt.json"]; assert z.getinfo("receipt.json").file_size<=1048576; print(z.read("receipt.json").decode())'],
    { input: archive, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 }));
    verifyRecoveryReceipt({ receipt, metadata: recoveryMetadata, run: recoveryRun, jobs: recoveryJobs,
      input: { ...input, recoveryArtifactId: id, recoverySha256: sha256 }, source: metadata, sourceJobs: jobs });
    writeFileSync(resolve(directory, 'recovery-proof.json'), JSON.stringify({ metadata: recoveryMetadata, run: recoveryRun, jobs: recoveryJobs, receipt }, null, 2) + '\n', { mode: 0o600 });
    writeFileSync(resolve(directory, 'recovery.zip'), archive, { mode: 0o600 });
    recovery = { artifactId: id, archiveSha256: sha256, runId: recoveryRun.id, headSha: recoveryRun.head_sha };
  }
  const log = api(`actions/jobs/${deploy[0].id}/logs`);
  verifyPreviousDeploymentLog(log, input);
  writeFileSync(resolve(directory, 'source-proof.json'), JSON.stringify({ metadata, jobs }, null, 2) + '\n', { mode: 0o600 });
  writeFileSync(resolve(directory, 'source-deploy.log'), log, { mode: 0o600 });
  const archive = api(`actions/artifacts/${input.artifactId}/zip`, true);
  assert.equal(createHash('sha256').update(archive).digest('hex'), input.archiveSha256, 'Downloaded archive digest mismatch');
  const zipPath = resolve(directory, 'previous-worker.zip');
  writeFileSync(zipPath, archive, { mode: 0o600 });
  const previousStatic = resolve(directory, 'static');
  const extraction = JSON.parse(execFileSync('python3', [resolve(import.meta.dirname, 'extract-previous-web-assets.py'), zipPath, input.archiveSha256, previousStatic], { encoding: 'utf8', timeout: 120000 }));
  const result = { previousStatic, source: { ...input, runId, headSha: metadata.workflow_run.head_sha, ...(recovery ? { recovery } : {}) }, extraction };
  writeFileSync(resolve(directory, 'capture.json'), JSON.stringify(result, null, 2) + '\n', { mode: 0o600 });
  return result;
}

async function main() {
  if (process.argv.length !== 2) throw Error('Use explicit PREVIOUS_WEB_ARTIFACT_ID, PREVIOUS_WEB_ARTIFACT_SHA256 and ROLLBACK_VERSION');
  const input = previousArtifactInput(process.env);
  const root = resolve(import.meta.dirname, '..');
  const parent = resolve(root, '.release-records');
  mkdirSync(parent, { recursive: true, mode: 0o700 });
  const directory = resolve(parent, `previous-main-${randomUUID()}`);
  const { previousStatic, source, extraction } = capturePreviousWebAssets({ input, directory, recoveryInput: {
    artifactId: process.env.PREVIOUS_WEB_RECOVERY_ARTIFACT_ID, archiveSha256: process.env.PREVIOUS_WEB_RECOVERY_SHA256,
  } });
  const record = retainWebAssets({ previousStatic, artifactDirectory: resolve(root, 'apps/web/.open-next'), source });
  const verification = verifyRetainedWebAssets(resolve(root, 'apps/web/.open-next'), input.versionId);
  writeFileSync(resolve(directory, 'provenance.json'), JSON.stringify({ source: record.source, extraction, verification }, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({ directory, source: record.source, copied: record.copied, ...verification }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
