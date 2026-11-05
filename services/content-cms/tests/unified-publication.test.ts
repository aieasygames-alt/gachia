import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { artifactFiles } from '../../../scripts/desktop-publish.mjs'
import { baselineDirectory } from '../src/inventory-baseline'
import { digest } from '../../../scripts/desktop-release-assets.mjs'
import { projectRoot } from '../src/local-environment'
import { freezeUnifiedContent } from '../src/unified-build'
import { objectValue } from '../src/unified-content'
import { unifiedPlan } from '../src/unified-plan'
import { prepareUnifiedPublication, verifyUnifiedPublication } from '../src/unified-publication'
import { readUnifiedSources } from '../src/unified-sources'
import { prepareUnifiedTransport, verifyUnifiedTransport } from '../src/unified-transport'

const repo = path.resolve(projectRoot, '../..'), json = (value: unknown) => JSON.stringify(value, null, 2) + '\n'

async function fixture(directory: string) {
  const write = (file: string, content: string | Buffer) => { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, content); return digest(content) }
  const save = (file: string, value: unknown) => write(file, json(value))
  const inventory = JSON.parse(readFileSync(path.join(repo, baselineDirectory, 'inventory.json'), 'utf8'))
  const plan = unifiedPlan(readUnifiedSources().sources, inventory.scopes.map((scope: { id: string }) => scope.id))
  const record = structuredClone(plan.sources.find(source => source.sourcePath === 'packages/data/games/hi3/raw-characters.json')!.records[0])
  assert(objectValue(record.structuredValue)); record.structuredValue.name = 'New fixture'
  const active = plan.sources.map(source => {
    const text = readFileSync(path.join(repo, source.sourcePath), 'utf8')
    return { sourcePath: source.sourcePath, text, sha256: digest(text) }
  })
  const frozen = freezeUnifiedContent({ repo, directory: path.join(directory, 'build'),
    commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(), plan,
    records: [record], activeSources: active, preview: true })
  const build = frozen.directory, candidate = path.join(build, 'artifacts/main'), previous = path.join(directory, 'previous')
  for (const [artifact, role] of [[candidate, 'new'], [previous, 'old']]) {
    write(path.join(artifact, 'worker.js'), `export default {role:'${role}'}`)
    write(path.join(artifact, '.build/open-next.config.edge.mjs'), 'export default {}')
    write(path.join(artifact, 'assets/BUILD_ID'), role)
    write(path.join(artifact, `assets/_next/static/${role}.js`), `console.log('${role}')`)
  }
  write(path.join(previous, 'cloudflare/cache-assets-manifest.sql'), 'SELECT 1;')
  write(path.join(previous, 'server-functions/default/app/.next/server/pages/404.html'), '<main>not a Worker module</main>')
  const expectations = [{ owner: 'main', path: '/zh/hi3/characters/fixture', status: 200, contains: ['New fixture'] }]
  const baselineExpectations = [{ ...expectations[0], contains: ['Old fixture'] }]
  const responses = [
    { path: expectations[0].path, status: 200, mime: 'text/html', text: '<main>New fixture</main>' },
    { path: '/sitemap.xml', status: 200, mime: 'application/xml', text: '<urlset />' },
    { path: '/robots.txt', status: 200, mime: 'text/plain', text: 'User-agent: *\n' },
    { path: '/api/auth/get-session', status: 404, mime: 'application/json', text: '{"code":"ACCOUNT_FEATURES_DISABLED"}' },
  ]
  const files = JSON.parse(readFileSync(path.join(build, 'files.json'), 'utf8')) as { path: string; sha256: string }[]
  for (const file of files.filter(row => /^apps\/web\/public\/(?:data|data-client|data-manifest)\/.+\.json$/.test(row.path))) {
    const relative = file.path.slice('apps/web/public/'.length), text = readFileSync(path.join(build, 'source', file.path), 'utf8')
    write(path.join(candidate, 'assets', relative), text)
    write(path.join(previous, 'assets', relative), text)
    responses.push({ path: '/' + relative, status: 200, mime: 'application/json', text })
  }
  for (const source of active.filter(row => row.sourcePath.startsWith('packages/data/games/'))) {
    const relative = source.sourcePath.slice('packages/data/games/'.length)
    if (existsSync(path.join(previous, 'assets/data', relative))) write(path.join(previous, 'assets/data', relative), source.text)
  }
  const references = responses.map((response, index) => ({ path: response.path, status: response.status,
    headers: { 'content-type': response.mime }, bytes: Buffer.byteLength(response.text), bodyFile: `${index}.body`,
    sha256: write(path.join(build, `main-http/${index}.body`), response.text) }))
  const owners = { main: { status: 'built_and_locally_accepted', artifactSHA256: save(path.join(build, 'main-artifact.json'), artifactFiles(candidate)),
    referencesPin: save(path.join(build, 'main-http/references.json'), references), responses: references.length } }
  save(path.join(build, 'build-state.json'), { status: 'all_owners_built_and_locally_accepted', owners, cloudWrites: false })
  const buildPin = save(path.join(build, 'build.json'), { schemaVersion: 1, kind: 'unified_owner_build', frozenPin: frozen.manifestPin,
    sourceTreeSHA256: frozen.sourceTreeSHA256, candidateSHA256: frozen.candidate.candidateSHA256, publicationPolicy: frozen.publicationPolicy,
    owners, expectationsPin: save(path.join(build, 'consumer-expectations.json'), expectations), preview: true, productionReady: false, cloudWrites: false })
  const code = Buffer.from('export default {archived:true}'), form = new FormData()
  form.set('worker.js', new Blob([code]), 'worker.js')
  const archive = Buffer.from(await new Response(form).arrayBuffer()), modulePath = path.join(directory, 'previous.multipart')
  const archiveSHA256 = write(modulePath, archive), previousPath = path.join(directory, 'previous.json')
  const snapshot = { schemaVersion: 1, kind: 'unified_previous_artifacts', purpose: 'local_compatibility_only', owners: { main: {
    service: 'gachia', versionId: '00000000-0000-0000-0000-000000000001', directory: previous,
    artifactSHA256: digest(json(artifactFiles(previous))), modulePath, archiveSHA256, moduleSHA256: digest(code),
  } } }
  const previousPin = save(previousPath, snapshot)
  const input = { buildDirectory: build, buildPin, previousPath, previousPin, baselineExpectations, directory: path.join(directory, 'publication') }
  return { input, write, save, snapshot, previous, candidate }
}

// Real loopback HTTP for the orchestration tests; actual OpenNext/Worker evidence
// is kept separately from these synthetic artifacts.
const serve = async (_cwd: string, configPath: string, _home: string, _log: string, accept: (origin: string) => Promise<void>) => {
  const config = JSON.parse(readFileSync(configPath, 'utf8'))
  const server = createServer((request, response) => {
    const url = request.url!, file = path.join(config.assets.directory, decodeURI(url))
    let body: Buffer | string = '', mime = 'text/html', status = 200
    if (url === '/sitemap.xml') { body = '<urlset />'; mime = 'application/xml' }
    else if (url === '/robots.txt') { body = 'User-agent: *\n'; mime = 'text/plain' }
    else if (url.startsWith('/api/')) { status = 404; body = '{"code":"ACCOUNT_FEATURES_DISABLED"}'; mime = 'application/json' }
    else if (existsSync(file)) { body = readFileSync(file); mime = url.endsWith('.js') ? 'text/javascript' : 'application/json' }
    else body = `<main>${config.name.includes('recovery') ? 'Old' : 'New'} fixture</main>`
    response.writeHead(status, { 'content-type': mime }); response.end(body)
  })
  server.listen(0, '127.0.0.1')
  await new Promise<void>(resolve => server.once('listening', resolve))
  try {
    const address = server.address(); assert(address && typeof address !== 'string')
    await accept(`http://127.0.0.1:${address.port}`)
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) }
}

test('unified publication binds both artifact directions, public A, old module, consumers and independent HTTP evidence', async t => {
  const directory = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'unified-publication-')))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const f = await fixture(directory)
  const result = await prepareUnifiedPublication(f.input, { serve })
  assert.equal(result.preview, true); assert.equal(result.activationSupported, false)
  assert.equal(result.rawUuidRollbackAuthorized, false); assert.equal(result.productionReady, false)
  assert(result.owners.main.candidate.responses > 400 && result.owners.main.recovery.responses > 400)
  await verifyUnifiedPublication(result.directory, result.publicationPin)
  await assert.rejects(prepareUnifiedPublication(f.input, { serve }), /EEXIST/)
  await assert.rejects(verifyUnifiedPublication(result.directory, '0'.repeat(64)), /evidence changed/)
  const body = path.join(result.directory, 'main/recovery-http/0.body'), originalBody = readFileSync(body)
  f.write(body, '<main>New fixture</main>')
  await assert.rejects(verifyUnifiedPublication(result.directory, result.publicationPin), /AssertionError/)
  f.write(body, originalBody)
  const state = path.join(result.directory, 'state.json')
  f.save(state, { status: 'failed', cloudWrites: false })
  await assert.rejects(verifyUnifiedPublication(result.directory, result.publicationPin), /Partial or failed/)
  f.save(state, { status: 'complete', cloudWrites: false })
  const receipt = path.join(result.directory, 'publication.json'), originalReceipt = readFileSync(receipt)
  const incomplete = f.save(receipt, { ...JSON.parse(originalReceipt.toString()), owners: {} })
  await assert.rejects(verifyUnifiedPublication(result.directory, incomplete), /Incomplete publication owner/)
  f.write(receipt, originalReceipt)
  f.write(path.join(result.directory, 'main/recovery/worker.js'), 'wrong module')
  await assert.rejects(verifyUnifiedPublication(result.directory, result.publicationPin), /unauthorized non-static/)
  f.write(path.join(result.directory, 'main/recovery/worker.js'), 'export default {archived:true}')
  const archive = readFileSync(f.snapshot.owners.main.modulePath)
  f.write(f.snapshot.owners.main.modulePath, 'bad archive')
  await assert.rejects(verifyUnifiedPublication(result.directory, result.publicationPin), /archive changed/)
  f.write(f.snapshot.owners.main.modulePath, archive)
  await verifyUnifiedPublication(result.directory, result.publicationPin)
})

test('wrong public A, missing owners and incomplete recovery consumers stop before copying or starting a Worker', async t => {
  const directory = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'unified-publication-rejected-')))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const f = await fixture(directory)
  const mustNotServe = async () => assert.fail('Rejected evidence must not start a Worker')
  await assert.rejects(prepareUnifiedPublication({ ...f.input, baselineExpectations: [] }, { serve: mustNotServe }), /Missing/)
  const original = readFileSync(f.input.previousPath)
  const pin = f.save(f.input.previousPath, { ...f.snapshot, owners: {} })
  await assert.rejects(prepareUnifiedPublication({ ...f.input, previousPin: pin }, { serve: mustNotServe }), /Incomplete previous owner/)
  f.write(f.input.previousPath, original)
  f.write(path.join(f.previous, 'assets/data/hi3/raw-characters.json'), '[{"id":"old-git-regression"}]')
  f.snapshot.owners.main.artifactSHA256 = digest(json(artifactFiles(f.previous)))
  const changedPin = f.save(f.input.previousPath, f.snapshot)
  await assert.rejects(prepareUnifiedPublication({ ...f.input, previousPin: changedPin }, { serve: mustNotServe }), /preserve public A/)
  assert(!existsSync(f.input.directory))
})

test('HTTP failure is retained as failed evidence and the attempt cannot be overwritten or resumed', async t => {
  const directory = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'unified-publication-failed-')))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const f = await fixture(directory)
  let calls = 0
  const failure = async () => { calls++; throw Error('Deliberate local Worker failure') }
  await assert.rejects(prepareUnifiedPublication(f.input, { serve: failure }), /Deliberate/)
  assert.equal(JSON.parse(readFileSync(path.join(f.input.directory, 'state.json'), 'utf8')).status, 'failed')
  assert(!existsSync(path.join(f.input.directory, 'publication.json')))
  await assert.rejects(prepareUnifiedPublication(f.input, { serve: failure }), /EEXIST/)
  assert.equal(calls, 1)
  assert(!existsSync(path.join(f.input.directory, 'operation.lock')))
})

test('sealed transport runs actual dry-runs and reopens module, metadata, config, publication and HTTP evidence', async t => {
  const directory = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'unified-transport-')))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const f = await fixture(directory), publication = await prepareUnifiedPublication(f.input, { serve })
  const input = { publicationDirectory: publication.directory, publicationPin: publication.publicationPin, directory: path.join(directory, 'transport') }
  const result = await prepareUnifiedTransport(input, { serve })
  assert.equal(result.receipt.preview, true); assert.equal(result.receipt.credentials, false); assert.equal(result.receipt.productionReady, false)
  assert.equal(result.receipt.owners.main.recovery.moduleSHA256, publication.owners.main.runtimeModuleSHA256)
  await verifyUnifiedTransport(result.directory, result.transportPin)
  await assert.rejects(prepareUnifiedTransport(input, { serve }), /EEXIST/)
  await assert.rejects(verifyUnifiedTransport(result.directory, '0'.repeat(64)), /evidence changed/)
  for (const file of ['main/candidate/module/worker.js', 'main/recovery/exact.multipart', 'main/candidate/upload.json',
    'main/recovery/http/0.body', 'main/candidate/semantics.json', 'main/candidate/compile-invocation.json', 'main/recovery/exact.log']) {
    const target = path.join(result.directory, file), original = readFileSync(target)
    f.write(target, 'tampered')
    await assert.rejects(verifyUnifiedTransport(result.directory, result.transportPin), /AssertionError/)
    f.write(target, original)
  }
  const extra = path.join(result.directory, 'main/candidate/module/extra.js')
  f.write(extra, 'unreviewed module')
  await assert.rejects(verifyUnifiedTransport(result.directory, result.transportPin), /Additional sealed modules/)
  rmSync(extra)
  const receiptFile = path.join(result.directory, 'transport.json'), original = readFileSync(receiptFile)
  const missing = f.save(receiptFile, { ...result.receipt, owners: {} })
  await assert.rejects(verifyUnifiedTransport(result.directory, missing), /Incomplete transport owner/)
  const promoted = f.save(receiptFile, { ...result.receipt, preview: false })
  await assert.rejects(verifyUnifiedTransport(result.directory, promoted), /AssertionError/)
  f.write(receiptFile, original)
  const state = path.join(result.directory, 'state.json')
  f.save(state, { status: 'failed', cloudWrites: false })
  await assert.rejects(verifyUnifiedTransport(result.directory, result.transportPin), /Partial or failed transport/)
  f.save(state, { status: 'complete', cloudWrites: false })
  await verifyUnifiedTransport(result.directory, result.transportPin)
})

test('sealed transport rejects stale publication pins and retains failed acceptance without retry', async t => {
  const directory = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'unified-transport-failed-')))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const f = await fixture(directory), publication = await prepareUnifiedPublication(f.input, { serve })
  const input = { publicationDirectory: publication.directory, publicationPin: publication.publicationPin, directory: path.join(directory, 'transport') }
  let calls = 0
  const fail = async () => { calls++; throw Error('Deliberate sealed HTTP failure') }
  const overlapping = path.join(f.previous, 'transport')
  await assert.rejects(prepareUnifiedTransport({ ...input, directory: overlapping }, { serve: fail }), /overlaps input/)
  assert(!existsSync(overlapping)); assert.equal(calls, 0)
  await assert.rejects(prepareUnifiedTransport({ ...input, publicationPin: '0'.repeat(64) }, { serve: fail }), /evidence changed/)
  assert(!existsSync(input.directory)); assert.equal(calls, 0)
  await assert.rejects(prepareUnifiedTransport(input, { serve: fail }), /Deliberate sealed HTTP failure/)
  assert.equal(calls, 1); assert(!existsSync(path.join(input.directory, 'transport.json')))
  assert.equal(JSON.parse(readFileSync(path.join(input.directory, 'state.json'), 'utf8')).status, 'failed')
  await assert.rejects(prepareUnifiedTransport(input, { serve: fail }), /EEXIST/)
  assert.equal(calls, 1); assert(!existsSync(path.join(input.directory, 'operation.lock')))
})
