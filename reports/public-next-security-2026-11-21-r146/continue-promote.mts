// Fixed R146 security rollout. This is not a general deploy or content editor.
import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { pathToFileURL } from 'node:url'
import { artifactFiles, isolatedEnvironment, withLocalWorker, withRunLock } from '../../scripts/desktop-publish.mjs'
import { assertDiskBudget, BUILD_TEMP_BUDGET } from '../../scripts/desktop-disk-preflight.mjs'
import { assertTopology, desktopCloudSnapshot } from '../../scripts/desktop-cloud-release.mjs'
import { digest } from '../../scripts/desktop-release-assets.mjs'
import { assertUploadMetadata, assertUploadedVersion, multipartModule, normalizedBindings } from '../../scripts/desktop-cloud-transport.mjs'
import { migrationPinned, migrationSave } from '../../scripts/genshin-migration-http.mjs'
import { prepareUnifiedAssetPair, verifyUnifiedAssetPair, unifiedStaticFiles, unifiedService } from '../../scripts/unified-release-assets.mjs'
import { unifiedTransportTool, unifiedDryRun, unifiedConfigSemantics } from '../../scripts/unified-cloud-module.mjs'
import { unifiedProductionRead, unifiedUploadResponse } from '../../scripts/unified-production-transport.mjs'
import { readUnifiedVersion, captureUnifiedUploadedModule, revalidateUnifiedUploadedModule } from '../../scripts/unified-version-identity.mjs'
import { exactUnifiedPreviewOrigin } from '../../scripts/unified-version-preview.mjs'
import { readUnifiedSourceOwner } from '../../scripts/unified-source-advance.mjs'
import { unifiedOwnerDeploymentWriter } from '../../scripts/unified-owner-deployment.mjs'
import { captureNteHTTP, verifyNteHTTP, recheckNteReferences } from '../../scripts/nte-release-http.mjs'
import { createUnifiedPreviewNetwork, createGenshinPublicNetwork } from '../../scripts/unified-preview-network.mjs'
import { prepareNteMainCandidate } from '../../scripts/nte-main-candidate.mjs'
import { parseWrangler } from '../../scripts/game-release.mjs'
import { PUBLIC_RUNTIME_POLICY, PUBLIC_RUNTIME_OWNERS } from '../../scripts/public-runtime-history.mjs'
import { verifyAppRuntime } from '../../scripts/require-app-runtime.mjs'
import { readNteSourceIndex } from '../../services/content-cms/src/nte-release-history.ts'
import { freezeMainConsumerSource, verifyMainConsumerSource } from '../../services/content-cms/src/main-consumer-source.ts'
import { captureUnifiedExecutorSource } from '../../services/content-cms/src/unified-executor-source.ts'
import { createUnifiedExecutorVerifier } from '../../services/content-cms/src/unified-production.ts'
import { nteRuntimeConfig, nteRequests } from '../../services/content-cms/src/nte-release-bundle.ts'
import { materialConsumerContract } from '../../services/content-cms/src/material-consumer-contract.ts'

const root = import.meta.dirname, repo = path.resolve(root, '../..'), owners = PUBLIC_RUNTIME_OWNERS
const parent = { path: path.join(repo, 'reports/genshin-collection-production-2026-11-21-r143/published-sources/source-index.json'), pin: '6598ff503df109ca57e0df4928ed99a9084f0e7d366401e39e9c2fe06117db57' }
// Task-owned CONNECT forwarder; TLS remains end-to-end and verified.
const proxy = 'http://127.0.0.1:18646', buildNode = '/opt/homebrew/opt/node@22/bin/node'
const pnpm = '/opt/homebrew/lib/node_modules/pnpm/bin/pnpm.cjs'
const app = (owner: string) => owner === 'main' ? 'web' : 'game-' + owner
const environment = (owner: string) => owner === 'lvmeng' ? 'production' : ''
const save = (file: string, value: any) => migrationSave(root, file, value)
const load = (file: string) => JSON.parse(readFileSync(path.join(root, file), 'utf8'))
const preparedFile = () => existsSync(path.join(root, 'prepared-final.json')) ? 'prepared-final.json' : 'prepared.json'
const modulesFile = () => existsSync(path.join(root, 'sealed-modules-final.json')) ? 'sealed-modules-final.json' : 'sealed-modules.json'
const proof = (file: string) => ({ path: path.join(root, file), pin: digest(readFileSync(path.join(root, file))) })
const treePin = (directory: string) => digest(JSON.stringify(artifactFiles(directory), null, 2) + '\n')
function auth(minutes = 5) {
  const text = readFileSync(path.join(homedir(), '.wrangler/config/default.toml'), 'utf8')
  const field = (key: string) => JSON.parse(text.match(new RegExp('^' + key + '\\s*=\\s*("[^"\\r\\n]*")\\s*$', 'm'))![1])
  assert(Date.parse(field('expiration_time')) > Date.now() + minutes * 60000, 'Refresh existing Wrangler login before proceeding')
  return field('oauth_token') as string
}
async function command(exe: string, args: string[], cwd: string, env: any, log: string) {
  await new Promise<void>((yes, no) => {
    const child = spawn(exe, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] })
    for (const stream of [child.stdout, child.stderr]) stream!.on('data', bytes => appendFileSync(log, bytes))
    child.once('error', no); child.once('close', code => code === 0 ? yes() : no(Error(`Command ${code}: ${log}`)))
  })
}
async function staging(token: string) {
  const result: any = {}
  for (const service of ['gachia-game-genshin-staging', 'gachia-game-azur-promilia-staging', 'gachia-router-staging']) {
    result[service] = {}
    for (const endpoint of ['deployments', 'settings']) {
      const response = await unifiedProductionRead(`https://api.cloudflare.com/client/v4/accounts/e6472b6c6172a3ac1e1596ef100543ae/workers/scripts/${service}/${endpoint}`,
        { method: 'GET', headers: { authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(30000) })
      const body = await response.json(); assert(response.ok && body.success)
      if (endpoint === 'settings') body.result.bindings = body.result.bindings.map((row: any) => row.type === 'secret_text' ? { name: row.name, type: row.type } : row)
      result[service][endpoint] = body.result
    }
  }
  return result
}
function runtime(workspace: string, owner: string) {
  if (owner === 'main') return { ...nteRuntimeConfig(workspace, 'main', 'candidate', false), find_additional_modules: false }
  const original = parseWrangler(readFileSync(path.join(workspace, 'apps', app(owner), 'wrangler.jsonc'), 'utf8'))
  const config = { ...original, ...(owner === 'lvmeng' ? original.env.production : {}), find_additional_modules: false }
  if (['genshin', 'nte'].includes(owner)) delete config.env
  assert.equal(config.name, unifiedService(owner)); return config
}
function localConfig(owner: string, config: any, artifact: string, module: string) {
  const result: any = { name: 'runtime-security-' + owner, main: module, no_bundle: true, find_additional_modules: false,
    compatibility_date: config.compatibility_date, compatibility_flags: config.compatibility_flags ?? [], vars: config.vars,
    assets: { binding: 'ASSETS', directory: path.join(artifact, 'assets') },
    services: (config.services ?? []).map((row: any) => ({ binding: row.binding, service: 'runtime-security-' +
      (row.service === 'gachia' ? 'main' : row.service.replace('gachia-game-', '')) })) }
  if (owner === 'main') Object.assign(result, { d1_databases: [{ binding: 'DB', database_name: 'runtime-security-local', database_id: '00000000-0000-0000-0000-000000000000' }],
    r2_buckets: [{ binding: 'IMAGES', bucket_name: 'runtime-security-local' }] })
  return result
}
async function prepared() {
  const p = load(preparedFile()), executor = captureUnifiedExecutorSource(repo)
  assert.equal(executor.commit, p.commit)
  verifyMainConsumerSource(repo, p.workspaceProof, migrationPinned(load('baseline.json').active))
  for (const owner of owners) verifyAppRuntime(path.join(p.workspace, 'apps', app(owner)))
  executor.verify(); return { p, executor }
}
async function wanted(workspace: string, sources: any, owner: string, artifact: string) {
  let result: any = { requests: [], values: new Map() }
  const add = (url: string, status = 200, sha256?: string) => {
    const row = result.requests.find((row: any) => row.path === url)
    if (row) { assert.equal(row.status, status); if (sha256) row.sha256 = sha256 }
    else result.requests.push({ path: url, status, ...(sha256 ? { sha256 } : {}) })
  }
  if (['main', 'nte'].includes(owner)) result = await nteRequests(workspace, owner, 'candidate', artifact, false, sources.sources, undefined,
    owner === 'main' ? sources.owners.main.directory : undefined)
  if (owner === 'genshin') {
    // Retain the complete accepted R143 material/character coverage, dropping
    // only its old asset list; the new static union is derived below.
    const q = JSON.parse(readFileSync(path.join(repo, 'reports/genshin-collection-production-2026-11-21-r143/qualification.json'), 'utf8'))
    for (const row of recheckNteReferences(q.roles.candidate.local)) if (!/^\/(?:_next|_games\/genshin\/_next)\//.test(row.path)) add(row.path, row.status)
  }
  const locales = owner === 'lvmeng' ? ['zh'] : ['zh', 'en', 'ja']
  const pages: Record<string, string[]> = { main: ['', 'privacy', 'search'], genshin: ['genshin'], nte: ['nte'],
    'azur-promilia': ['azur-promilia', 'azur-promilia/characters', 'azur-promilia/characters/abby', 'azur-promilia/weapons', 'azur-promilia/guides'],
    lvmeng: ['lvmeng', 'lvmeng/characters', 'lvmeng/guides', 'lvmeng/download', 'lvmeng/launch-check'] }
  for (const locale of locales) for (const page of pages[owner]) add(`/${locale}/${page}`.replace(/\/$/, ''))
  if (owner === 'main') {
    for (const game of ['endfield', 'starrail', 'roco-cn']) for (const page of materialConsumerContract(game, sources.sources).pages) add(page.path)
    for (const url of ['/ads.txt', '/sitemaps/main/sitemap.xml', '/zh/hi3/guides/new-returning-captain-route', '/zh/sea/guides/beginner-guide']) add(url)
  }
  if (owner === 'lvmeng') { add('/en/lvmeng', 404); add('/ja/lvmeng', 404) }
  add('/robots.txt'); add('/sitemap.xml')
  // Every owned public JSON and all immutable assets, including the retained
  // previous runtime's chunks, have expected bytes independently of HTML.
  for (const file of artifactFiles(artifact).filter((row: any) => row.type === 'file' &&
    /^assets\/(?:data\/|data-client\/|data-manifest\/|_games\/[^/]+\/content\/|__content\/)/.test(row.path) && row.path.endsWith('.json'))) {
    const url = '/' + file.path.slice(7); add(url, 200, file.sha256)
    result.values.set(url, JSON.parse(readFileSync(path.join(artifact, file.path), 'utf8')))
  }
  for (const file of unifiedStaticFiles(artifact, owner)) add('/' + file.path.slice(7).split('/').map(encodeURIComponent).join('/'), 200, file.sha256)
  assert(result.requests.length <= 2500); return result
}
async function local(p: any, sources: any, sealed: any, owner: string, role: string) {
  const base = path.join(root, 'local', owner, role), prior = path.join(base, 'responses/references.json')
  if (existsSync(prior)) {
    const proof = { path: prior, pin: digest(readFileSync(prior)) }, refs = recheckNteReferences(proof)
    const expected = await wanted(p.workspace, sources, owner, sealed.owners[owner][role].artifact)
    assert.deepEqual(refs.map((row: any) => [row.path, row.status]), expected.requests.map((row: any) => [row.path, row.status]))
    console.log(JSON.stringify({ phase: 'local_reopened', owner, role, requests: refs.length })); return proof
  }
  const directory = existsSync(base) ? base + '-continued' : base
  mkdirSync(directory, { recursive: true }); mkdirSync(path.join(directory, 'home'))
  const configs: any = {}, row = sealed.owners[owner][role]
  for (const dependency of owners) {
    const r = dependency === owner ? role : 'candidate', dep = sealed.owners[dependency][r]
    configs[dependency] = migrationSave(directory, dependency + '.json', localConfig(dependency, migrationPinned(dep.config), dep.artifact,
      path.join(root, 'sealed', dependency, r, 'worker.js'))).path
  }
  const requests = await wanted(p.workspace, sources, owner, row.artifact)
  const result = await withLocalWorker(path.join(p.workspace, 'apps', app(owner)), configs[owner], path.join(directory, 'home'), path.join(directory, 'worker.log'),
    (origin: string) => captureNteHTTP({ origin, requests: requests.requests, jsonValues: requests.values, directory: path.join(directory, 'responses') }),
    { wranglerEntrypoint: sealed.tool.bin, additionalConfigs: owner === 'main' ? ['genshin', 'nte'].map(dep => configs[dep]) : [] })
  console.log(JSON.stringify({ phase: 'local', owner, role, requests: requests.requests.length })); return result.proof
}
async function graph(p: any, sources: any, s: any) {
  const base = path.join(root, 'candidate-graph'), directory = existsSync(base) ? base + '-continued' : base
  mkdirSync(directory); mkdirSync(path.join(directory, 'home'))
  const module = path.join(directory, 'published-router.mjs'); writeFileSync(module, sources.routerCode, { flag: 'wx' })
  assert.equal(digest(readFileSync(module)), migrationPinned(sources.router.moduleProof).moduleSHA256)
  const router = (await import(pathToFileURL(module).href)).default, configs: any = {}, origins: any = {}
  for (const owner of owners) {
    const row = s.owners[owner].candidate
    configs[owner] = migrationSave(directory, owner + '.json', localConfig(owner, migrationPinned(row.config), row.artifact,
      path.join(root, 'sealed', owner, 'candidate/worker.js'))).path
  }
  const requests = await nteRequests(p.workspace, 'router', 'candidate', undefined, false, sources.sources, undefined, sources.owners.main.directory)
  for (const owner of owners) for (const row of recheckNteReferences(s.publicReferences[owner])) {
    // These paths already have complete per-owner direct/cloud/public checks.
    // Keep the independent aggregate within its existing 2,500-request budget.
    if (/^\/(?:_next|_games\/[^/]+\/_next)\//.test(row.path)) continue
    if (!requests.requests.some((wanted: any) => wanted.path === row.path)) requests.requests.push({ path: row.path, status: row.status })
  }
  assert(requests.requests.length <= 2500)
  const start = async (index: number): Promise<any> => {
    const owner = owners[index]
    return withLocalWorker(path.join(p.workspace, 'apps', app(owner)), configs[owner], path.join(directory, 'home'), path.join(directory, owner + '.log'), async (origin: string) => {
      origins[owner] = origin
      if (index + 1 < owners.length) return start(index + 1)
      const binding = (name: string) => ({ fetch: async (input: Request | string, init?: RequestInit) => {
        const request = input instanceof Request ? new Request(input, init) : new Request(input, init), url = new URL(request.url), headers = new Headers(request.headers)
        headers.delete('host')
        const response = await fetch(origins[name] + url.pathname + url.search, { method: request.method, headers, redirect: 'manual', signal: AbortSignal.timeout(30000) })
        const bytes = Buffer.from(await response.arrayBuffer()), output = new Headers(response.headers)
        for (const key of ['content-encoding', 'content-length', 'transfer-encoding']) output.delete(key)
        return new Response([204, 205, 304].includes(response.status) ? null : bytes, { status: response.status, headers: output })
      } })
      const env = { ...nteRuntimeConfig(p.workspace, 'router', 'candidate', false).vars,
        MAIN_SITE: binding('main'), GENSHIN_SITE: binding('genshin'), NTE_SITE: binding('nte'), AZUR_PROMILIA_SITE: binding('azur-promilia'), LVMENG_SITE: binding('lvmeng') }
      const server = createServer(async (req, res) => {
        try {
          const headers = new Headers(); for (const [name, value] of Object.entries(req.headers)) if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value)
          const response = await router.fetch(new Request('https://gachia.com' + req.url, { method: req.method, headers }), env,
            { waitUntil: (promise: Promise<any>) => promise.catch(console.error), passThroughOnException() {} })
          res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()))
        } catch (error) { res.writeHead(500); res.end(String(error)) }
      })
      server.listen(0, '127.0.0.1'); await once(server, 'listening')
      try {
        const result = await captureNteHTTP({ origin: `http://127.0.0.1:${(server.address() as any).port}`, requests: requests.requests, jsonValues: requests.values, directory: path.join(directory, 'responses') })
        migrationSave(directory, 'runtime.json', { kind: 'published_router_module_binding_bridge_to_real_workerd_http', routerModuleSHA256: digest(sources.routerCode),
          node: process.version, owners, actualWorkerResponses: true, routerWorkerdClaimed: false })
        return result.proof
      } finally { server.close(); await once(server, 'close') }
    }, { wranglerEntrypoint: s.tool.bin })
  }
  return start(0)
}
async function checked() {
  const { p, executor } = await prepared(), s = load('sealed.json'), sources = await readNteSourceIndex(parent)
  assert.equal(s.commit, p.commit)
  for (const owner of owners) {
    verifyUnifiedAssetPair({ owner, previous: sources.owners[owner].directory, candidate: load(owner + '-built.json').artifact,
      forward: s.owners[owner].candidate.artifact, recovery: s.owners[owner].recovery.artifact, runtimeSHA256: sources.owners[owner].moduleSHA256 })
    for (const role of ['candidate', 'recovery']) {
      const row = s.owners[owner][role], config = migrationPinned(row.config)
      assert.equal(config.name, unifiedService(owner)); assert.equal(treePin(row.artifact), row.artifactPin)
      const exact = await multipartModule(readFileSync(path.join(root, 'sealed', owner, role, 'exact.multipart')))
      assertUploadMetadata(exact.metadata, config); assert.equal(exact.moduleSHA256, row.moduleSHA256)
      recheckNteReferences(row.local)
    }
    recheckNteReferences(s.publicReferences[owner])
  }
  recheckNteReferences(s.graph)
  executor.verify(); return { p, s, sources, executor }
}
async function ci(p: any) {
  const runID = Number(process.env.PUBLIC_RUNTIME_RUN_ID || load('executor-ci.json').runID)
  const result = await createUnifiedExecutorVerifier(runID, execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim())
  assert.equal(result.executorCommit, p.commit); return result
}

// Fixed continuation body appended below.
// All runtime/build inputs and tested upload/deployment writers are unchanged.
// The only qualification change is applying the exact published Router's
// cache header projection to archived workerd HTML. Never redeploy Genshin.
import {recheckNteHTTP} from '../../scripts/nte-release-http.mjs'
console.log(JSON.stringify({phase:'promote_continuation',at:new Date().toISOString()}))
const {p,s:original,executor}=await checked(),a=load('accepted.json'),verifiedCI=await ci(p)
assert.deepEqual(a.executorCI,verifiedCI.executorCI)
const qualification=load('public-reference-qualification.json'),s=migrationPinned(qualification.qualifiedSealed)
assert.equal(qualification.status,'passed');assert.equal(qualification.validatorChanged,false)
assert.deepEqual(qualification.originalSealed,proof('sealed.json'))
const {publicReferences:oldReferences,...oldRest}=original,{publicReferences:newReferences,...newRest}=s
assert.deepEqual(oldRest,newRest)
for(const owner of owners)recheckNteReferences(s.publicReferences[owner])
const journal=path.join(root,'production.jsonl'),prior=readFileSync(journal,'utf8').trim().split('\n').map(JSON.parse)
assert.deepEqual(prior.map((row:any)=>[row.phase,row.owner]),[['deployment_intent','genshin'],['deployed','genshin']])
const first=load('genshin-deployed.json'),firstVersion=a.accepted.genshin.candidate.versionId
assert.equal(first.versionId,firstVersion);assert.deepEqual(prior[1].deployment,first.deployment)
const promoted:any={[unifiedService('genshin')]:firstVersion},deployments:any={genshin:first.deployment},publicProofs:any={}
assertTopology(a.before,await desktopCloudSnapshot(auth(),unifiedProductionRead),promoted)
assert.deepEqual(await staging(auth()),load('baseline.json').staging)
for(const role of ['candidate','recovery']){
 const resultFile=`fresh-genshin-${role}/result.json`
 recheckNteHTTP({proof:proof(resultFile),origin:a.accepted.genshin[role].origin,references:recheckNteReferences(s.owners.genshin[role].local),preview:true})
}
const waitStarted=Date.now()
while(!existsSync(path.join(root,'genshin-public-requalified.json'))){
 assert(Date.now()-waitStarted<300000,'Independent Genshin public requalification did not finish')
 await new Promise(resolve=>setTimeout(resolve,500))
}
publicProofs.genshin=load('genshin-public-requalified.json')
recheckNteHTTP({proof:publicProofs.genshin,origin:'https://gachia.com',references:recheckNteReferences(s.publicReferences.genshin)})
const previewNetwork=await createUnifiedPreviewNetwork(proxy),publicNetwork=await createGenshinPublicNetwork(proxy)
try{await withRunLock(root,async()=>{
 const record=(value:any)=>appendFileSync(journal,JSON.stringify({at:new Date().toISOString(),...value})+'\n',{flush:true})
 record({phase:'production_accepted',owner:'genshin',proof:publicProofs.genshin})
 for(const owner of owners.filter(owner=>owner!=='genshin')){
  const token=auth(),service=unifiedService(owner),versionId=a.accepted[owner].candidate.versionId
  executor.verify();verifiedCI.verify();assertTopology(a.before,await desktopCloudSnapshot(token,unifiedProductionRead),promoted)
  assert.deepEqual(await staging(token),load('baseline.json').staging)
  for(const role of ['candidate','recovery']){
   const row=a.accepted[owner][role],receipt=migrationPinned(row.moduleProof)
   await revalidateUnifiedUploadedModule({proof:row.moduleProof,service,versionId:row.versionId,moduleSHA256:row.moduleSHA256,context:receipt.context,
    readVersion:(name:string,id:string)=>readUnifiedVersion({service:name,versionId:id,token,request:unifiedProductionRead})})
   await verifyNteHTTP({origin:row.origin,references:recheckNteReferences(s.owners[owner][role].local),directory:path.join(root,`fresh-${owner}-${role}`),preview:true,request:previewNetwork.request,owner})
  }
  assertTopology(a.before,await desktopCloudSnapshot(token,unifiedProductionRead),promoted)
  const releaseKey=digest(JSON.stringify({policy:PUBLIC_RUNTIME_POLICY,owner,sealed:proof('sealed.json'),ci:a.executorCI}))
  record({phase:'deployment_intent',owner,service,versionId,releaseKey})
  const writer=unifiedOwnerDeploymentWriter({owner,releaseKey,versionId,token,request:fetch,
   recordResponse:async({kind,status,bytes}:any)=>save(`deployment-${owner}-${kind}.json`,{status,body:JSON.parse(bytes),raw:bytes.toString()})})
  const deployment=await writer({owner,service,versionId,releaseKey});record({phase:'deployed',owner,deployment})
  deployments[owner]=deployment;promoted[service]=versionId;save(owner+'-deployed.json',{deployment,versionId,releaseKey})
  assertTopology(a.before,await desktopCloudSnapshot(token,unifiedProductionRead),promoted)
  const result=await verifyNteHTTP({origin:'https://gachia.com',references:recheckNteReferences(s.publicReferences[owner]),directory:path.join(root,'public-'+owner),request:publicNetwork.request,owner:'router'})
  publicProofs[owner]={path:path.join(root,'public-'+owner,'result.json'),pin:result.evidenceSHA256}
  record({phase:'production_accepted',owner,proof:publicProofs[owner]})
 }
 const token=auth(),after=await desktopCloudSnapshot(token,unifiedProductionRead);assertTopology(a.before,after,promoted)
 assert.deepEqual(await staging(token),load('baseline.json').staging)
 const aggregate=await verifyNteHTTP({origin:'https://gachia.com',references:recheckNteReferences(s.graph),directory:path.join(root,'public-aggregate'),request:publicNetwork.request,owner:'router'})
 save('completion.json',{status:'production_accepted',policy:PUBLIC_RUNTIME_POLICY,nextVersion:'15.5.29',commit:p.commit,parent,active:p.active,
  executorCI:a.executorCI,accepted:a.accepted,before:a.before,after,promoted,deployments,publicProofs,
  aggregate:{path:path.join(root,'public-aggregate/result.json'),pin:aggregate.evidenceSHA256},prepared:proof(preparedFile()),
  sealed:qualification.qualifiedSealed,journal:proof('production.jsonl'),
  continuation:{qualification:proof('public-reference-qualification.json'),producer:proof('qualify-public.mts'),executor:proof('continue-promote.mts'),
   originalExecutorCommit:p.commit,originalSealed:proof('sealed.json'),genshinDeploymentReplayed:false}})
 save('aggregate-accepted.json',{path:path.join(root,'public-aggregate/result.json'),pin:aggregate.evidenceSHA256})
 executor.verify();verifiedCI.verify()
})}finally{await previewNetwork.close();await publicNetwork.close()}
console.log(JSON.stringify({phase:'promote_continuation',completed:true,at:new Date().toISOString()}))
