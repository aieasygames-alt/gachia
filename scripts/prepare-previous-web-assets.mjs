import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { retainWebAssets, verifyRetainedWebAssets } from './retain-web-assets.mjs';

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

async function main() {
  if (process.argv.length !== 2) throw Error('Use explicit PREVIOUS_WEB_ARTIFACT_ID, PREVIOUS_WEB_ARTIFACT_SHA256 and ROLLBACK_VERSION');
  const input = previousArtifactInput(process.env);
  const root = resolve(import.meta.dirname, '..');
  const api = (path, binary = false) => execFileSync('gh', ['api', `/repos/${repository}/${path}`], {
    encoding: binary ? undefined : 'utf8', maxBuffer: 128 * 1024 * 1024, timeout: binary ? 300000 : 180000,
  });
  const metadata = JSON.parse(api(`actions/artifacts/${input.artifactId}`));
  const runId = verifyPreviousArtifact(metadata, input);
  const jobs = JSON.parse(api(`actions/runs/${runId}/jobs?per_page=100`)).jobs;
  const deploy = jobs.filter(job => job.name === 'deploy' && job.conclusion === 'success');
  assert.equal(deploy.length, 1, 'One successful previous production deployment required');
  const log = api(`actions/jobs/${deploy[0].id}/logs`);
  verifyPreviousDeploymentLog(log, input);
  const directory = resolve(root, '.release-records', `previous-main-${randomUUID()}`);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const archive = api(`actions/artifacts/${input.artifactId}/zip`, true);
  assert.equal(createHash('sha256').update(archive).digest('hex'), input.archiveSha256, 'Downloaded archive digest mismatch');
  const zipPath = resolve(directory, 'previous-worker.zip');
  writeFileSync(zipPath, archive, { mode: 0o600 });
  const previousStatic = resolve(directory, 'static');
  const extraction = JSON.parse(execFileSync('python3', [resolve(root, 'scripts/extract-previous-web-assets.py'), zipPath, input.archiveSha256, previousStatic], { encoding: 'utf8', timeout: 120000 }));
  const record = retainWebAssets({ previousStatic, artifactDirectory: resolve(root, 'apps/web/.open-next'), source: { ...input, runId, headSha: metadata.workflow_run.head_sha } });
  const verification = verifyRetainedWebAssets(resolve(root, 'apps/web/.open-next'), input.versionId);
  writeFileSync(resolve(directory, 'provenance.json'), JSON.stringify({ source: record.source, extraction, verification }, null, 2) + '\n', { mode: 0o600 });
  console.log(JSON.stringify({ directory, source: record.source, copied: record.copied, ...verification }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
