import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPreviousArtifactApi, previousArtifactInput, verifyPreviousArtifact, verifyPreviousDeploymentLog } from './prepare-previous-web-assets.mjs';
import { ACCOUNT, ZONE, PUBLIC_ORIGIN, RECOVERY_WORKFLOW, trustedMainRun, sourceDeploymentJob, activeMain, assertRecoveryAcceptance } from './web-recovery-policy.mjs';
import { verifyWorkerArtifact } from './verify-worker-artifact.mjs';

const root = resolve(import.meta.dirname, '..');
const directory = resolve(root, '.release-records/main-recovery');
const hash = data => createHash('sha256').update(data).digest('hex');
const save = (name, data) => writeFileSync(resolve(directory, name), JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });

export async function cloudSnapshot(token, request = fetch) {
  assert(token, 'Cloudflare API token required');
  const get = async path => {
    const response = await request(`https://api.cloudflare.com/client/v4/${path}`, {
      method: 'GET', redirect: 'error', headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000),
    });
    const json = await response.json();
    assert(response.ok && json.success, `Read-only Cloudflare API failed: ${response.status} ${path}`);
    return json.result;
  };
  const snapshot = { services: {}, bindings: {} };
  for (const service of ['gachia', 'gachia-staging', 'gachia-router', 'gachia-game-genshin', 'gachia-game-nte', 'gachia-game-azur-promilia', 'gachia-game-lvmeng']) {
    const history = await get(`accounts/${ACCOUNT}/workers/scripts/${service}/deployments`);
    const latest = history.deployments.toSorted((a, b) => Date.parse(a.created_on) - Date.parse(b.created_on)).at(-1);
    assert(latest?.versions?.length === 1 && latest.versions[0].percentage === 100, `Split/missing ${service} deployment`);
    snapshot.services[service] = latest;
    const settings = await get(`accounts/${ACCOUNT}/workers/scripts/${service}/settings`);
    snapshot.bindings[service] = settings.bindings.map(binding => binding.type === 'secret_text' ? { type: binding.type, name: binding.name } : binding);
  }
  snapshot.routes = await get(`zones/${ZONE}/workers/routes`);
  snapshot.domains = (await get(`accounts/${ACCOUNT}/workers/domains`)).filter(row => row.hostname === 'gachia.com' || row.hostname.endsWith('.gachia.com'));
  return snapshot;
}

export async function verifyAllPublicStatic(assets, request = fetch) {
  let files = 0, bytes = 0;
  for (const entry of readdirSync(assets, { recursive: true, withFileTypes: true })) {
    assert(!entry.isSymbolicLink(), 'Linked static asset');
    if (!entry.isFile()) continue;
    assert(++files <= 5000, 'Static request budget exceeded');
    const path = resolve(entry.parentPath, entry.name);
    const expected = readFileSync(path);
    bytes += expected.length;
    assert(bytes <= 64 * 1024 * 1024, 'Static byte budget exceeded');
    const suffix = path.slice(assets.length + 1).split('/').map(encodeURIComponent).join('/');
    const response = await request(`${PUBLIC_ORIGIN}/_next/static/${suffix}`, {
      method: 'GET', credentials: 'omit', redirect: 'manual', signal: AbortSignal.timeout(30000),
    });
    assert.equal(response.status, 200, suffix);
    const actual = Buffer.from(await response.arrayBuffer());
    assert.equal(actual.length, expected.length, suffix);
    assert.equal(hash(actual), hash(expected), suffix);
  }
  assert(files > 0, 'No sealed static files');
  return { files, bytes, allStaticBytesEqual: true };
}

async function main() {
  assert.equal(process.argv.length, 2);
  assert.equal(process.env.GITHUB_REF, 'refs/heads/main', 'Recovery only runs from trusted main');
  assert.equal(process.env.GITHUB_EVENT_NAME, 'workflow_dispatch');
  assert.match(process.env.GITHUB_RUN_ID ?? '', /^[1-9][0-9]*$/);
  assert.match(process.env.GITHUB_SHA ?? '', /^[a-f0-9]{40}$/);
  const input = previousArtifactInput(process.env);
  const tarSha256 = process.env.SOURCE_TAR_SHA256;
  assert.match(tarSha256 ?? '', /^[a-f0-9]{64}$/);
  assert(!existsSync(directory), 'Do not overwrite recovery evidence');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const record = { schemaVersion: 1, origin: PUBLIC_ORIGIN, service: 'gachia', deploymentPerformed: false,
    status: 'running', startedAt: new Date().toISOString(), verificationRunId: process.env.GITHUB_RUN_ID, verificationSha: process.env.GITHUB_SHA };
  try {
    const api = createPreviousArtifactApi();
    const metadata = JSON.parse(api(`actions/artifacts/${input.artifactId}`));
    const runId = verifyPreviousArtifact(metadata, input);
    const run = JSON.parse(api(`actions/runs/${runId}`));
    trustedMainRun(run, '.github/workflows/deploy.yml');
    assert.equal(run.head_sha, metadata.workflow_run.head_sha);
    const jobs = JSON.parse(api(`actions/runs/${runId}/jobs?per_page=100`)).jobs;
    const job = sourceDeploymentJob(jobs);
    const log = api(`actions/jobs/${job.id}/logs`);
    verifyPreviousDeploymentLog(log, input);
    save('source-artifact.json', metadata); save('source-run.json', run); save('source-jobs.json', jobs);
    writeFileSync(resolve(directory, 'source-deploy.log'), log, { mode: 0o600 });
    // Recovery changes observability only; data/runtime expectations must still match the deployed source.
    execFileSync('git', ['diff', '--exit-code', run.head_sha, '--', 'apps', 'packages', 'pnpm-lock.yaml',
      'scripts/runtime-rollout-smoke.mjs', 'scripts/web-release-policy.mjs', 'scripts/retain-web-assets.mjs',
      'scripts/web-published-sitemap-audit.py', 'scripts/web-sitemap-contract-audit.py'], { cwd: root, stdio: 'pipe' });
    record.source = { ...input, runId, headSha: run.head_sha, tarSha256 };
    record.before = await cloudSnapshot(process.env.CLOUDFLARE_API_TOKEN);
    activeMain(record.before, input.versionId);
    save('before.json', record.before);
    const archive = api(`actions/artifacts/${input.artifactId}/zip`, true);
    assert.equal(hash(archive), input.archiveSha256);
    writeFileSync(resolve(directory, 'source.zip'), archive, { mode: 0o600 });
    assert(!existsSync(resolve(root, 'apps/web/.open-next')), 'Recovery must restore the exact sealed artifact, never an existing build');
    execFileSync('python3', [resolve(root, 'scripts/restore-recovery-artifact.py'), resolve(directory, 'source.zip'), input.archiveSha256, tarSha256, resolve(root, 'apps/web')], { cwd: root, stdio: 'inherit' });
    const node = script => execFileSync(process.execPath, [resolve(root, 'scripts', script)], { cwd: root, stdio: 'inherit', timeout: 1800000 });
    save('portability.json', verifyWorkerArtifact(resolve(root, 'apps/web/.open-next')));
    const checkXml = name => {
      execFileSync('python3', ['-B', 'scripts/web-published-sitemap-audit.py', 'production', '--output', resolve(directory, name)], { cwd: root, stdio: 'inherit', timeout: 300000 });
      const xml = JSON.parse(readFileSync(resolve(directory, name)));
      assert.equal(xml.status, 'published_xml_graph_verified');
      return xml;
    };
    const xmlBefore = checkXml('xml-before.json');
    node('production-site-audit.mjs');
    node('web-production-acceptance.mjs');
    const results = readdirSync(resolve(root, '.release-records')).filter(name => name.startsWith('web-production-'));
    assert.equal(results.length, 1, 'Ambiguous acceptance result');
    const resultPath = resolve(root, '.release-records', results[0], 'result.json');
    const acceptance = JSON.parse(readFileSync(resultPath));
    assertRecoveryAcceptance(acceptance);
    record.acceptanceStatus = acceptance.status;
    record.acceptanceSha256 = hash(readFileSync(resultPath));
    const xml = checkXml('xml.json');
    assert.deepEqual(xml.owners, xmlBefore.owners, 'XML owner sets changed during recovery');
    record.xmlStatus = xml.status;
    record.xmlSha256 = hash(readFileSync(resolve(directory, 'xml.json')));
    const statics = await verifyAllPublicStatic(resolve(root, 'apps/web/.open-next/assets/_next/static'));
    record.staticFiles = statics.files; record.staticBytes = statics.bytes; record.allStaticBytesEqual = true;
    // This is the final production step skipped by the original failed job.
    for (const locale of ['zh', 'en', 'ja']) for (const suffix of ['', '/vermillion-liuli', '/vermillion-liuli-full-burn', '/volatile-sparkler']) {
      const response = await fetch(`${PUBLIC_ORIGIN}/${locale}/hi3/weapons${suffix}`, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
      assert.equal(response.status, 200, 'HI3 reading smoke failed');
    }
    record.after = await cloudSnapshot(process.env.CLOUDFLARE_API_TOKEN);
    activeMain(record.after, input.versionId);
    assert.deepEqual(record.after, record.before, 'Worker/route/binding changed during read-only acceptance');
    record.ownerGraphUnchanged = true;
    record.status = 'read_only_production_recovery_verified';
    record.workflow = RECOVERY_WORKFLOW;
    save('receipt.json', { ...record, finishedAt: new Date().toISOString() });
  } catch (error) {
    record.status = 'failed'; record.error = error.message; throw error;
  } finally {
    save('result.json', { ...record, finishedAt: new Date().toISOString() });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
