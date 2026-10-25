import assert from 'node:assert/strict';

export const RECOVERY_WORKFLOW = '.github/workflows/web-production-recovery.yml';
export const REPOSITORY_ID = 1229333607;
export const MAIN_SERVICE = 'gachia';
export const PUBLIC_ORIGIN = 'https://gachia.com';
export const ACCOUNT = 'e6472b6c6172a3ac1e1596ef100543ae';
export const ZONE = '9ebfe7f1aeb7225947a1fc50c0deffc8';

export function trustedMainRun(run, path) {
  assert.equal(run.path, path);
  assert.equal(run.event, 'workflow_dispatch');
  assert.equal(run.head_branch, 'main');
  assert.equal(run.repository?.id, REPOSITORY_ID);
  assert.equal(run.head_repository?.id, REPOSITORY_ID);
  assert.match(run.head_sha ?? '', /^[a-f0-9]{40}$/);
  assert.equal(run.status, 'completed');
}

export function sourceDeploymentJob(jobs) {
  for (const name of ['build', 'deploy-staging']) {
    const selected = jobs.filter(job => job.name === name);
    assert.equal(selected.length, 1, `One ${name} required`);
    assert.equal(selected[0].conclusion, 'success', `${name} did not pass`);
  }
  const deploy = jobs.filter(job => job.name === 'deploy');
  assert.equal(deploy.length, 1);
  for (const name of ['Verify and restore web artifact', 'Record main deployment before promotion', 'Verify production static retention before promotion', 'Deploy to Cloudflare']) {
    const steps = deploy[0].steps.filter(step => step.name === name);
    assert.equal(steps.length, 1, `One source step ${name} required`);
    assert.equal(steps[0].conclusion, 'success', `Source step ${name} failed`);
  }
  return deploy[0];
}

export function activeMain(snapshot, versionId) {
  const deployment = snapshot.services?.[MAIN_SERVICE];
  assert.equal(deployment?.versions?.length, 1, 'Split/missing Main deployment');
  assert.equal(deployment.versions[0].percentage, 100);
  assert.equal(deployment.versions[0].version_id, versionId, 'Active Main version drift');
  return deployment;
}

export function assertRecoveryAcceptance(record) {
  assert.equal(record.origin, PUBLIC_ORIGIN);
  assert.equal(record.status, 'main_production_verified_accounts_disabled');
  assert.equal(record.deploymentPerformed, false);
  assert.equal(record.http?.length, 32);
  assert.equal(record.browser?.length, 18);
  for (const [name, count] of Object.entries({ http: 23, fallbackHttp: 171, json: 7, search: 3, browser: 520, indexnow: 1, retainedAssets: 12 })) {
    assert.equal(record.managedContent?.[name]?.length, count, `Incomplete recovery acceptance: ${name}`);
  }
}

export function verifyRecoveryArtifact({ metadata, run, input }) {
  assert.equal(String(metadata.id), input.recoveryArtifactId);
  assert.equal(metadata.expired, false);
  assert.equal(metadata.digest, `sha256:${input.recoverySha256}`);
  assert(metadata.size_in_bytes > 0 && metadata.size_in_bytes <= 1024 * 1024, 'Recovery archive budget exceeded');
  trustedMainRun(run, RECOVERY_WORKFLOW);
  assert.equal(run.conclusion, 'success', 'Recovery workflow did not succeed');
  assert.equal(metadata.workflow_run?.id, run.id);
  assert.equal(metadata.workflow_run?.head_sha, run.head_sha);
  assert.equal(metadata.name, `main-recovery-receipt-${run.id}-${run.run_attempt}`);
}

export function verifyRecoveryReceipt({ receipt, metadata, run, jobs, input, source, sourceJobs }) {
  verifyRecoveryArtifact({ metadata, run, input });
  const verification = jobs.filter(job => job.name === 'verify-production');
  assert.equal(verification.length, 1);
  assert.equal(verification[0].conclusion, 'success');
  sourceDeploymentJob(sourceJobs);
  assert.equal(receipt.schemaVersion, 1);
  assert.equal(receipt.status, 'read_only_production_recovery_verified');
  assert.equal(receipt.deploymentPerformed, false);
  assert.equal(receipt.origin, PUBLIC_ORIGIN);
  assert.equal(receipt.service, MAIN_SERVICE);
  assert.equal(receipt.verificationRunId, String(run.id));
  assert.equal(receipt.verificationSha, run.head_sha);
  assert.equal(receipt.source.artifactId, input.artifactId);
  assert.equal(receipt.source.archiveSha256, input.archiveSha256);
  assert.equal(receipt.source.versionId, input.versionId);
  assert.equal(receipt.source.headSha, source.workflow_run.head_sha);
  assert.equal(receipt.source.runId, source.workflow_run.id);
  assert.match(receipt.source.tarSha256 ?? '', /^[a-f0-9]{64}$/);
  activeMain(receipt.before, input.versionId);
  activeMain(receipt.after, input.versionId);
  assert.deepEqual(receipt.before, receipt.after, 'Production changed during recovery');
  assert.equal(receipt.acceptanceStatus, 'main_production_verified_accounts_disabled');
  assert.equal(receipt.xmlStatus, 'published_xml_graph_verified');
  assert.equal(receipt.allStaticBytesEqual, true);
  assert.equal(receipt.ownerGraphUnchanged, true);
  assert(receipt.staticFiles > 0);
}
