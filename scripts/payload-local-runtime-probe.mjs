import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readResolvedPackage } from './require-app-runtime.mjs';

const root = resolve(import.meta.dirname, '..');
const output = resolve(root, process.argv[2] ?? 'reports/payload-real-slice-2026-11-01/local-runtime.json');
if (!output.startsWith(root + '/reports/')) throw new Error('New repository report required');
const runtimeRequire = createRequire(realpathSync(resolve(root, 'apps/web/node_modules/wrangler/package.json')));
const cmsRequire = createRequire(resolve(root, 'services/content-cms/package.json'));
const { Miniflare, convertV4MiniflareOptions } = runtimeRequire('miniflare');
const directory = await mkdtemp(join(tmpdir(), 'payload-local-runtime-'));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const options = convertV4MiniflareOptions({ host: '127.0.0.1', port: 0, modules: true,
  script: 'export default { fetch() { return new Response("synthetic local experiment"); } }',
  compatibilityDate: '2026-10-01', resourcePersistencePath: directory,
  d1Databases: ['DB', 'RESTORE'], r2Buckets: ['ARTIFACTS'], telemetry: { enabled: false }, cf: false });
options.unsafeEnableSharedStorage = false;
const evidence = { schema: 'payload-local-runtime-probe-v1', cloudAccess: false, realDataAccess: false,
  toolchain: { node: process.version, miniflare: readResolvedPackage(runtimeRequire, 'miniflare').version,
    workerd: readResolvedPackage(createRequire(runtimeRequire.resolve('miniflare')), 'workerd').version },
  payloadAdapterVerified: false, productionVerified: false, experiments: [],
  postgresTools: Object.fromEntries(['postgres', 'initdb', 'pg_ctl', 'psql', 'docker'].map(tool => {
    const result = spawnSync('which', [tool], { encoding: 'utf8' });
    return [tool, result.status === 0 ? result.stdout.trim() : null];
  })),
  adapters: Object.fromEntries(['@payloadcms/db-postgres', '@payloadcms/db-d1-sqlite', '@payloadcms/storage-r2'].map(name => {
    try { return [name, { installed: true, entry: cmsRequire.resolve(name) }]; } catch { return [name, { installed: false }]; }
  })) };
let runtime;
try {
  runtime = new Miniflare(options);
  const url = await runtime.ready;
  assert.equal(url.hostname, '127.0.0.1');
  const db = await runtime.getD1Database('DB');
  await db.exec('CREATE TABLE releases (id TEXT PRIMARY KEY, body TEXT NOT NULL); CREATE TABLE active (id INTEGER PRIMARY KEY, release_id TEXT REFERENCES releases(id), revision INTEGER NOT NULL); CREATE TABLE jobs (id TEXT PRIMARY KEY, state TEXT NOT NULL, owner TEXT);');
  await assert.rejects(db.batch([
    db.prepare('INSERT INTO releases VALUES (?, ?)').bind('rollback-test', 'synthetic'),
    db.prepare('INSERT INTO releases VALUES (?, ?)').bind('rollback-test', 'duplicate'),
  ]));
  assert.equal(await db.prepare('SELECT count(*) AS n FROM releases').first('n'), 0);
  evidence.experiments.push({ name: 'd1-batch-rollback', passed: true });
  await db.batch([db.prepare('INSERT INTO releases VALUES (?, ?)').bind('a', 'synthetic-a'), db.prepare('INSERT INTO releases VALUES (?, ?)').bind('b', 'synthetic-b'), db.prepare('INSERT INTO active VALUES (1, ?, 0)').bind('a')]);
  await assert.rejects(db.prepare('INSERT INTO active VALUES (2, ?, 0)').bind('missing').run());
  evidence.experiments.push({ name: 'd1-foreign-key-rejection', passed: true });
  const cas = await Promise.all(Array.from({ length: 12 }, () => db.prepare('UPDATE active SET release_id = ?, revision = revision + 1 WHERE id = 1 AND revision = 0').bind('b').run()));
  assert.equal(cas.reduce((sum, result) => sum + result.meta.changes, 0), 1);
  evidence.experiments.push({ name: 'd1-conditional-update-race', passed: true, contenders: 12, winners: 1, scope: 'concurrent calls to one local D1 emulator, not distributed Payload activation' });
  await db.prepare('INSERT INTO jobs VALUES (?, ?, NULL)').bind('job-1', 'queued').run();
  const claims = await Promise.all(Array.from({ length: 12 }, (_, index) => db.prepare("UPDATE jobs SET state = 'running', owner = ? WHERE id = 'job-1' AND state = 'queued'").bind(`worker-${index}`).run()));
  assert.equal(claims.reduce((sum, result) => sum + result.meta.changes, 0), 1);
  evidence.experiments.push({ name: 'd1-single-claim', passed: true, contenders: 12, winners: 1, scope: 'raw SQL; not Payload queue, lease/retry/DLQ or crash recovery' });

  const dump = { releases: (await db.prepare('SELECT * FROM releases ORDER BY id').all()).results,
    active: (await db.prepare('SELECT * FROM active ORDER BY id').all()).results, jobs: (await db.prepare('SELECT * FROM jobs ORDER BY id').all()).results };
  const restore = await runtime.getD1Database('RESTORE');
  await restore.exec('CREATE TABLE releases (id TEXT PRIMARY KEY, body TEXT NOT NULL); CREATE TABLE active (id INTEGER PRIMARY KEY, release_id TEXT REFERENCES releases(id), revision INTEGER NOT NULL); CREATE TABLE jobs (id TEXT PRIMARY KEY, state TEXT NOT NULL, owner TEXT);');
  await restore.batch([...dump.releases.map(row => restore.prepare('INSERT INTO releases VALUES (?, ?)').bind(row.id, row.body)),
    ...dump.active.map(row => restore.prepare('INSERT INTO active VALUES (?, ?, ?)').bind(row.id, row.release_id, row.revision)),
    ...dump.jobs.map(row => restore.prepare('INSERT INTO jobs VALUES (?, ?, ?)').bind(row.id, row.state, row.owner))]);
  for (const table of ['releases', 'active', 'jobs']) assert.deepEqual((await restore.prepare(`SELECT * FROM ${table} ORDER BY id`).all()).results, dump[table]);
  evidence.experiments.push({ name: 'synthetic-logical-restore', passed: true, dumpSHA256: sha256(JSON.stringify(dump)), scope: 'three synthetic tables, no live backup or Payload/database-media joint restore' });

  const bucket = await runtime.getR2Bucket('ARTIFACTS');
  const objects = ['synthetic-release-a', 'synthetic-release-b'].map(body => ({ key: sha256(body), body }));
  for (const object of objects) {
    assert.ok(await bucket.put(object.key, object.body, { onlyIf: { etagDoesNotMatch: '*' } }));
    assert.equal(await bucket.put(object.key, 'overwrite-attempt', { onlyIf: { etagDoesNotMatch: '*' } }), null);
    assert.equal(sha256(Buffer.from(await (await bucket.get(object.key)).arrayBuffer())), object.key);
  }
  evidence.experiments.push({ name: 'local-r2-conditional-create-and-readback', passed: true, objects: objects.map(({ key }) => key), scope: 'local R2 API, synthetic strings, not real cloud durability/auth or Snapshot schema verification' });
  await runtime.dispose(); runtime = new Miniflare(options); await runtime.ready;
  const reopened = await runtime.getD1Database('DB');
  assert.equal(await reopened.prepare('SELECT revision FROM active WHERE id = 1').first('revision'), 1);
  const retained = await runtime.getR2Bucket('ARTIFACTS');
  for (const object of objects) assert.equal(await (await retained.get(object.key)).text(), object.body);
  evidence.experiments.push({ name: 'local-runtime-reopen', passed: true, scope: 'graceful runtime restart on one host; not power loss, GC, revocation or regional recovery' });
  evidence.passed = true;
} catch (error) {
  evidence.passed = false; evidence.error = String(error.stack); process.exitCode = 1;
} finally {
  if (runtime) await runtime.dispose();
  await rm(directory, { recursive: true, force: true });
  evidence.temporaryStateRemoved = true;
  evidence.remaining = ['PostgreSQL runtime and Payload adapter experiments', 'Payload D1/R2 adapters', 'real migrations, editor locks, queue semantics', 'live backup, access control, bundle size, cost and SLO'];
  await writeFile(output, JSON.stringify(evidence, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(evidence, null, 2));
}
