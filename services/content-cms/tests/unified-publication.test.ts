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
import { freezeUnifiedContent, verifyUnifiedFrozenSource } from '../src/unified-build'
import { GENSHIN_LOCAL_RAW, GENSHIN_LOCAL_SCOPE } from '../src/unified-genshin-local-scope'
import { verifyUnifiedOwnerBuild } from '../src/unified-owner-build'
import { dedicatedCharacterTextPairContract, mergeCharacterTextExpectations } from '../src/unified-character-text'
import { objectValue } from '../src/unified-content'
import { unifiedPlan } from '../src/unified-plan'
import { prepareUnifiedPublication, verifyUnifiedPublication } from '../src/unified-publication'
import { readUnifiedSources } from '../src/unified-sources'
import { prepareUnifiedTransport, verifyUnifiedTransport } from '../src/unified-transport'
import { readUnifiedGenshinMainLocal } from '../src/unified-genshin-main-local'

const repo = path.resolve(projectRoot, '../..'), json = (value: unknown) => JSON.stringify(value, null, 2) + '\n'
const characterHTML = (path: string, text: string) => `<html><head><title>Character</title><meta name="description" content="Character fixture"><link rel="canonical" href="https://gachia.com${path}"></head><body><main><p${text}/p></main></body></html>`

async function fixture(directory: string, game = 'hi3', genshinOnly = false) {
  const write = (file: string, content: string | Buffer) => { mkdirSync(path.dirname(file), { recursive: true }); writeFileSync(file, content); return digest(content) }
  const save = (file: string, value: unknown) => write(file, json(value))
  const inventory = JSON.parse(readFileSync(path.join(repo, baselineDirectory, 'inventory.json'), 'utf8'))
  const plan = unifiedPlan(readUnifiedSources().sources, inventory.scopes.map((scope: { id: string }) => scope.id))
  const records = plan.sources.find(source => source.sourcePath === `packages/data/games/${game}/raw-characters.json`)!.records
  const record = structuredClone(genshinOnly ? records.find(row => row.sourceRecord.locator.identity?.id === 'hu-tao')! : records[0])
  const field = genshinOnly ? 'nameEn' : 'name'
  assert(objectValue(record.structuredValue)); const oldName = record.structuredValue[field] as string; record.structuredValue[field] = 'New fixture'
  const active = plan.sources.map(source => {
    const text = readFileSync(path.join(repo, source.sourcePath), 'utf8')
    return { sourcePath: source.sourcePath, text, sha256: digest(text) }
  })
  const frozen = freezeUnifiedContent({ repo, directory: path.join(directory, 'build'),
    commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).trim(), plan,
    records: [record], activeSources: active, preview: true, ...(genshinOnly ? { localScope: GENSHIN_LOCAL_SCOPE } : {}) })
  const build = frozen.directory, candidate = path.join(build, 'artifacts/main'), previous = path.join(directory, 'previous')
  for (const [artifact, role] of [[candidate, 'new'], [previous, 'old']]) {
    write(path.join(artifact, 'worker.js'), `export default {role:'${role}'}`)
    write(path.join(artifact, '.build/open-next.config.edge.mjs'), 'export default {}')
    write(path.join(artifact, 'assets/BUILD_ID'), role)
    write(path.join(artifact, `assets/_next/static/${role}.js`), `console.log('${role}')`)
  }
  write(path.join(previous, 'cloudflare/cache-assets-manifest.sql'), 'SELECT 1;')
  write(path.join(previous, 'server-functions/default/app/.next/server/pages/404.html'), '<main>not a Worker module</main>')
  const pair = dedicatedCharacterTextPairContract(active, frozen.candidate.files.map(file => ({ sourcePath: file.sourcePath,
    text: readFileSync(path.join(build, 'source', file.sourcePath), 'utf8'), sha256: file.candidateSHA256 })))
  const mainExpectations = game === 'genshin' ? ['zh', 'en'].map(locale => ({ owner: 'main', path: `/${locale}/ananta/guides/download-install-guide`, status: 200, contains: ['Preserved Main'] }))
    : [{ owner: 'main', path: '/zh/hi3/characters/fixture', status: 200, contains: ['New fixture'] }]
  const expectations = mergeCharacterTextExpectations(genshinOnly ? [] : mainExpectations, pair.candidate)
  const baselineExpectations = genshinOnly ? [] : mainExpectations.map(row => ({ ...row, contains: [game === 'genshin' ? 'Preserved Main' : 'Old fixture'] }))
  const responses = [
    ...mainExpectations.map(row => ({ path: row.path, status: row.status, mime: 'text/html', text: game === 'genshin' ? characterHTML(row.path, '>Preserved Main<') : `<main>${row.contains[0]}</main>` })),
    { path: '/sitemap.xml', status: 200, mime: 'application/xml', text: '<urlset />' },
    { path: '/robots.txt', status: 200, mime: 'text/plain', text: 'User-agent: *\n' },
    { path: '/api/auth/get-session', status: 404, mime: 'application/json', text: '{"code":"ACCOUNT_FEATURES_DISABLED"}' },
  ]
  const files = JSON.parse(readFileSync(path.join(build, 'files.json'), 'utf8')) as { path: string; sha256: string }[]
  for (const file of files.filter(row => /^apps\/web\/public\/(?:data|data-client|data-manifest)\/.+\.json$/.test(row.path))) {
    const relative = file.path.slice('apps/web/public/'.length), text = readFileSync(path.join(build, 'source', file.path), 'utf8')
    write(path.join(candidate, 'assets', relative), text)
    write(path.join(previous, 'assets', relative), existsSync(path.join(repo, file.path)) ? readFileSync(path.join(repo, file.path), 'utf8') : text)
    responses.push({ path: '/' + relative, status: 200, mime: 'application/json', text })
  }
  for (const source of active.filter(row => row.sourcePath.startsWith('packages/data/games/'))) {
    const relative = source.sourcePath.slice('packages/data/games/'.length)
    if (existsSync(path.join(previous, 'assets/data', relative))) write(path.join(previous, 'assets/data', relative), source.text)
  }
  const references = responses.map((response, index) => ({ path: response.path, status: response.status,
    headers: { 'content-type': response.mime }, bytes: Buffer.byteLength(response.text), bodyFile: `${index}.body`,
    sha256: write(path.join(build, `main-http/${index}.body`), response.text) }))
  const owners: Record<string, any> = { main: { status: 'built_and_locally_accepted', artifactSHA256: save(path.join(build, 'main-artifact.json'), artifactFiles(candidate)),
    referencesPin: save(path.join(build, 'main-http/references.json'), references), responses: references.length } }
  const code = Buffer.from('export default {archived:true}'), form = new FormData()
  form.set('worker.js', new Blob([code]), 'worker.js')
  const archive = Buffer.from(await new Response(form).arrayBuffer()), modulePath = path.join(directory, 'previous.multipart')
  const archiveSHA256 = write(modulePath, archive), previousPath = path.join(directory, 'previous.json')
  const snapshot = { schemaVersion: 1, kind: 'unified_previous_artifacts', purpose: 'local_compatibility_only', owners: { main: {
    service: 'gachia', versionId: '00000000-0000-0000-0000-000000000001', directory: previous,
    artifactSHA256: digest(json(artifactFiles(previous))), modulePath, archiveSHA256, moduleSHA256: digest(code),
  } } as Record<string, any> }
  if (game === 'genshin') {
    for (const [artifact, role] of [[path.join(build, 'artifacts/genshin'), 'new'], [path.join(directory, 'previous-genshin'), 'old']]) {
      write(path.join(artifact, 'worker.js'), `export default {role:'${role}'}`)
      write(path.join(artifact, '.build/open-next.config.edge.mjs'), 'export default {}')
      write(path.join(artifact, 'assets/BUILD_ID'), role)
      for (const prefix of ['_next/static', '_games/genshin/_next/static']) write(path.join(artifact, `assets/${prefix}/${role}.js`), `console.log('${role}')`)
    }
    const artifact = path.join(build, 'artifacts/genshin'), old = path.join(directory, 'previous-genshin')
    if (genshinOnly) {
      write(path.join(artifact, 'assets', GENSHIN_LOCAL_RAW), readFileSync(path.join(build, 'source', record.sourceRecord.sourcePath)))
      write(path.join(old, 'assets', GENSHIN_LOCAL_RAW), active.find(row => row.sourcePath === record.sourceRecord.sourcePath)!.text)
    }
    const rows = [...pair.candidate.expectations.map(row => ({ path: row.path, status: 200, mime: 'text/html', text: characterHTML(row.path, '>New fixture<') })),
      { path: '/sitemap.xml', status: 200, mime: 'application/xml', text: '<urlset />' }, { path: '/robots.txt', status: 200, mime: 'text/plain', text: 'User-agent: *\n' }]
    const refs = rows.map((row, index) => ({ path: row.path, status: row.status, headers: { 'content-type': row.mime },
      bodyFile: `${index}.body`, bytes: Buffer.byteLength(row.text), sha256: write(path.join(build, `genshin-http/${index}.body`), row.text) }))
    owners.genshin = { status: 'built_and_locally_accepted', artifactSHA256: save(path.join(build, 'genshin-artifact.json'), artifactFiles(artifact)),
      referencesPin: save(path.join(build, 'genshin-http/references.json'), refs), responses: refs.length }
    snapshot.owners.genshin = { ...snapshot.owners.main, service: 'gachia-game-genshin', directory: old, artifactSHA256: digest(json(artifactFiles(old))),
      versionId: '00000000-0000-0000-0000-000000000002' }
  }
  if (genshinOnly) {
    delete owners.main; delete snapshot.owners.main
    rmSync(path.join(build, 'artifacts/main'), { recursive: true })
    rmSync(previous, { recursive: true })
  }
  save(path.join(build, 'build-state.json'), { status: 'all_owners_built_and_locally_accepted', owners, cloudWrites: false })
  const buildPin = save(path.join(build, 'build.json'), { schemaVersion: 2, kind: 'unified_owner_build', frozenPin: frozen.manifestPin,
    sourceTreeSHA256: frozen.sourceTreeSHA256, candidateSHA256: frozen.candidate.candidateSHA256, publicationPolicy: frozen.publicationPolicy,
    characterTextContract: pair.candidate, owners, expectationsPin: save(path.join(build, 'consumer-expectations.json'), expectations),
    ...(genshinOnly ? { localScope: GENSHIN_LOCAL_SCOPE } : {}),
    preview: true, productionReady: false, cloudWrites: false })
  const previousPin = save(previousPath, snapshot)
  const input = { buildDirectory: build, buildPin, previousPath, previousPin, baselineExpectations, directory: path.join(directory, 'publication') }
  return { input, write, save, snapshot, previous, candidate, pair, oldName, frozen }
}

// Real loopback HTTP for the orchestration tests; actual OpenNext/Worker evidence
// is kept separately from these synthetic artifacts.
const serveWith = (render?: (config: any, url: string) => string) => async (_cwd: string, configPath: string, _home: string, _log: string, accept: (origin: string) => Promise<void>) => {
  const config = JSON.parse(readFileSync(configPath, 'utf8'))
  const server = createServer((request, response) => {
    const url = request.url!, file = path.join(config.assets.directory, decodeURI(url))
    let body: Buffer | string = '', mime = 'text/html', status = 200
    if (url === '/sitemap.xml') { body = '<urlset />'; mime = 'application/xml' }
    else if (url === '/robots.txt') { body = 'User-agent: *\n'; mime = 'text/plain' }
    else if (url.startsWith('/api/')) { status = 404; body = '{"code":"ACCOUNT_FEATURES_DISABLED"}'; mime = 'application/json' }
    else if (existsSync(file)) { body = readFileSync(file); mime = url.endsWith('.js') ? 'text/javascript' : 'application/json' }
    else body = render ? render(config, url) : `<main>${config.name.includes('recovery') ? 'Old' : 'New'} fixture</main>`
    response.writeHead(status, { 'content-type': mime }); response.end(body)
  })
  server.listen(0, '127.0.0.1')
  await new Promise<void>(resolve => server.once('listening', resolve))
  try {
    const address = server.address(); assert(address && typeof address !== 'string')
    await accept(`http://127.0.0.1:${address.port}`)
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) }
}
const serve = serveWith()

test('explicit Genshin-only preview freezes one owner and checks A/B raw, pages, recovery and scope on independent reread', async t => {
  const directory = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'unified-genshin-only-')))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const f = await fixture(directory, 'genshin', true)
  assert.deepEqual(f.frozen.owners, ['genshin'])
  assert.deepEqual(f.frozen.services, ['gachia-game-genshin'])
  assert.equal(f.frozen.localScope, GENSHIN_LOCAL_SCOPE)
  assert(!existsSync(path.join(f.input.buildDirectory, 'artifacts/main')))
  verifyUnifiedOwnerBuild(f.input.buildDirectory, f.input.buildPin)
  const serveCharacter = serveWith((config, url) => characterHTML(url, config.name.includes('recovery')
    ? f.pair.recovery.expectations[0].contains[0] : '>New fixture<'))
  const publication = await prepareUnifiedPublication(f.input, { serve: serveCharacter })
  assert.deepEqual(Object.keys(publication.owners), ['genshin'])
  assert.equal(publication.localScope, GENSHIN_LOCAL_SCOPE)
  assert(publication.pending.includes('frozen Main readback with candidate and recovery'))
  assert.equal(publication.productionReady, false)
  assert.equal(publication.cloudWrites, false)
  assert(!existsSync(path.join(publication.directory, 'main')))
  const verified = await verifyUnifiedPublication(publication.directory, publication.publicationPin)
  for (const role of ['candidate', 'recovery'] as const) {
    const http = path.join(publication.directory, 'genshin', `${role}-http`)
    const refs = JSON.parse(readFileSync(path.join(http, 'references.json'), 'utf8'))
    const raw = refs.find((row: any) => row.path === GENSHIN_LOCAL_RAW)
    assert.equal(raw.sha256, f.pair[role].changes[0].candidateSHA256)
    assert(verified.genshinPublic![role].some(row => row.path === '/sitemaps/genshin/index.xml'))
    assert(!verified.genshinPublic![role].some(row => row.path === GENSHIN_LOCAL_RAW))
    const body = path.join(http, raw.bodyFile), original = readFileSync(body)
    f.write(body, '[]')
    await assert.rejects(verifyUnifiedPublication(publication.directory, publication.publicationPin), /body changed|strictly equal/)
    f.write(body, original)
  }
  await assert.rejects(prepareUnifiedTransport({ publicationDirectory: publication.directory, publicationPin: publication.publicationPin,
    directory: path.join(directory, 'forbidden-transport') }, { serve: async () => assert.fail('No transport Worker') }), /cannot enter the formal transport/)
  assert(!existsSync(path.join(directory, 'forbidden-transport')))
  const receiptPath = path.join(publication.directory, 'publication.json'), receiptBytes = readFileSync(receiptPath)
  const receipt = JSON.parse(receiptBytes.toString())
  const repinned = f.save(receiptPath, { ...receipt, localScope: undefined })
  await assert.rejects(verifyUnifiedPublication(publication.directory, repinned), /Local publication scope changed/)
  f.write(receiptPath, receiptBytes)
  const buildPath = path.join(f.input.buildDirectory, 'build.json'), buildBytes = readFileSync(buildPath)
  const legacy = f.save(buildPath, { ...JSON.parse(buildBytes.toString()), schemaVersion: 1 })
  assert.throws(() => verifyUnifiedOwnerBuild(f.input.buildDirectory, legacy), /require the character evidence/)
  f.write(buildPath, buildBytes)
  const manifestPath = path.join(f.input.buildDirectory, 'manifest.json'), manifestBytes = readFileSync(manifestPath)
  const drift = f.save(manifestPath, { ...f.frozen, owners: ['genshin', 'main'] })
  assert.throws(() => verifyUnifiedFrozenSource(f.input.buildDirectory, drift), /owner plan changed/)
  f.write(manifestPath, manifestBytes)
  const priorBytes = readFileSync(f.input.previousPath)
  const extraOwnerPin = f.save(f.input.previousPath, { ...f.snapshot, owners: { ...f.snapshot.owners, main: f.snapshot.owners.genshin } })
  await assert.rejects(prepareUnifiedPublication({ ...f.input, previousPin: extraOwnerPin,
    directory: path.join(directory, 'extra-owner') }, { serve: async () => assert.fail('No multi-owner Worker') }), /Incomplete previous owner set/)
  f.write(f.input.previousPath, priorBytes)
  const oldRaw = path.join(f.snapshot.owners.genshin.directory, 'assets', GENSHIN_LOCAL_RAW), oldBytes = readFileSync(oldRaw)
  f.write(oldRaw, '[]')
  const badSnapshot = structuredClone(f.snapshot)
  badSnapshot.owners.genshin.artifactSHA256 = digest(json(artifactFiles(badSnapshot.owners.genshin.directory)))
  const wrongRawPin = f.save(f.input.previousPath, badSnapshot)
  await assert.rejects(prepareUnifiedPublication({ ...f.input, previousPin: wrongRawPin,
    directory: path.join(directory, 'wrong-raw') }, { serve: async () => assert.fail('No raw-drift Worker') }), /does not preserve public A/)
  f.write(oldRaw, oldBytes); f.write(f.input.previousPath, priorBytes)
  await assert.rejects(prepareUnifiedPublication({ ...f.input, directory: path.join(directory, 'wrong-recovery') },
    { serve: serveWith((_config, url) => characterHTML(url, '>New fixture<')) }), /Edited value missing/)
  await verifyUnifiedPublication(publication.directory, publication.publicationPin)
  t.diagnostic(JSON.stringify({ kind: 'synthetic-artifact-orchestration-with-real-loopback-http', owners: ['genshin'],
    responses: Object.values(verified.receipt.owners).reduce((sum, row) => sum + row.candidate.responses + row.recovery.responses, 0),
    realOpenNextBuild: false, fixedMainReadback: false, productionReady: false }))
})

test('unified publication binds both artifact directions, public A, old module, consumers and independent HTTP evidence', async t => {
  const directory = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'unified-publication-')))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const f = await fixture(directory)
  const result = await prepareUnifiedPublication(f.input, { serve })
  assert.equal(result.schemaVersion, 2)
  assert.equal(result.preview, true); assert.equal(result.activationSupported, false)
  assert.equal(result.rawUuidRollbackAuthorized, false); assert.equal(result.productionReady, false)
  assert(result.owners.main.candidate.responses > 400 && result.owners.main.recovery.responses > 400)
  await verifyUnifiedPublication(result.directory, result.publicationPin)
  const receiptBeforeLegacyCheck = readFileSync(path.join(result.directory, 'publication.json'))
  const { characterTextContract: _contract, ...historical } = JSON.parse(receiptBeforeLegacyCheck.toString())
  const legacyPin = f.save(path.join(result.directory, 'publication.json'), { ...historical, schemaVersion: 1 })
  await verifyUnifiedPublication(result.directory, legacyPin)
  f.write(path.join(result.directory, 'publication.json'), receiptBeforeLegacyCheck)
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
  await assert.rejects(prepareUnifiedPublication({ ...f.input, baselineExpectations: [] }, { serve: mustNotServe }), /Recovery/)
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

test('real Genshin freeze automatically carries exact A/B character checks through publication, sealed transport and independent reread', async t => {
  const directory = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'unified-character-publication-')))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const f = await fixture(directory, 'genshin')
  assert.equal(f.input.baselineExpectations.length, 2, 'Caller supplies Main preservation only')
  const render = (config: any, url = f.pair.candidate.expectations[0].path) => {
    const old = config.name.includes('recovery'), dedicated = config.name.includes('genshin')
    return characterHTML(url, dedicated ? old ? f.pair.recovery.expectations[0].contains[0] : '>New fixture<' : '>Preserved Main<')
  }
  const serveCharacter = serveWith(render)
  const publication = await prepareUnifiedPublication(f.input, { serve: serveCharacter })
  assert.deepEqual(Object.keys(publication.owners), ['genshin', 'main'])
  assert.deepEqual(publication.characterTextContract, f.pair)
  const baselinePath = path.join(publication.directory, 'baseline-expectations.json'), baselineBytes = readFileSync(baselinePath)
  const baseline = JSON.parse(baselineBytes.toString())
  assert.deepEqual(baseline[2], f.pair.recovery.expectations[0])
  assert.deepEqual(f.input.baselineExpectations[0].contains, ['Preserved Main'], 'Caller input is not mutated')
  const verified = await verifyUnifiedPublication(publication.directory, publication.publicationPin)
  assert(verified.genshinPublic)
  for (const role of ['candidate', 'recovery'] as const) {
    assert(verified.genshinPublic[role].some(row => row.path === '/sitemaps/genshin/index.xml'))
    assert(verified.genshinPublic[role].some(row => row.path.startsWith('/_games/genshin/_next/static/')))
    assert(!verified.genshinPublic[role].some(row => row.path === '/robots.txt'))
  }
  const receiptPath = path.join(publication.directory, 'publication.json'), receiptBytes = readFileSync(receiptPath), receipt = JSON.parse(receiptBytes.toString())
  const { characterTextContract: _pair, ...withoutPair } = receipt
  const downgraded = f.save(receiptPath, { ...withoutPair, schemaVersion: 1 })
  await assert.rejects(verifyUnifiedPublication(publication.directory, downgraded), /schema downgrade forbidden/)
  f.write(receiptPath, receiptBytes)
  const incompletePin = f.save(baselinePath, baseline.map((row: any) => row.owner === 'genshin' ? { ...row, contains: ['Unrelated old text'] } : row))
  const repinned = f.save(receiptPath, { ...receipt, baselineExpectationsPin: incompletePin })
  await assert.rejects(verifyUnifiedPublication(publication.directory, repinned), /Required recovery character/)
  f.write(baselinePath, baselineBytes)
  const replacedContract = f.save(receiptPath, { ...receipt, characterTextContract: { ...f.pair, recovery: f.pair.candidate } })
  await assert.rejects(verifyUnifiedPublication(publication.directory, replacedContract), /Publication character text pair changed/)
  f.write(receiptPath, receiptBytes)
  const bodyPath = path.join(publication.directory, 'genshin/recovery-http/0.body'), oldBody = readFileSync(bodyPath)
  f.write(bodyPath, '<main><p>New fixture</p></main>')
  await assert.rejects(verifyUnifiedPublication(publication.directory, publication.publicationPin))
  f.write(bodyPath, oldBody)
  const transport = await prepareUnifiedTransport({ publicationDirectory: publication.directory, publicationPin: publication.publicationPin,
    directory: path.join(directory, 'transport') }, { serve: serveCharacter })
  await verifyUnifiedTransport(transport.directory, transport.transportPin)
  const localPair = await readUnifiedGenshinMainLocal({ directory: transport.directory, pin: transport.transportPin })
  assert.deepEqual(localPair.pair, f.pair); assert.equal(localPair.productionReady, false); assert.equal(localPair.preview, true)
  for (const role of ['candidate', 'recovery'] as const) {
    assert.equal(localPair.publicReferences[role].main.find((row: { path: string }) => row.path === '/data/genshin/raw-characters.json')!.sha256, f.pair[role].changes[0].candidateSHA256)
    assert(localPair.publicReferences[role].genshin.some(row => row.path === '/sitemaps/genshin/index.xml'))
  }
  assert.equal(transport.receipt.owners.genshin.recovery.moduleSHA256, f.snapshot.owners.genshin.moduleSHA256)
  assert.equal(transport.receipt.activationSupported, false)
  const wrongRecovery = serveWith(config => config.name.includes('genshin') ? '<main><p>New fixture</p></main>' : render(config))
  await assert.rejects(prepareUnifiedPublication({ ...f.input, directory: path.join(directory, 'wrong-recovery') }, { serve: wrongRecovery }), /Edited value missing/)
  assert(!existsSync(path.join(directory, 'wrong-recovery/publication.json')))
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
