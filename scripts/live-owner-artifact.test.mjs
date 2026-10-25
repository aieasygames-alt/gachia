import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { liveOwnerConfig, liveOwnerExecutionConfig, sealLiveOwnerArtifact, sha256, verifyLiveOwnerArtifact } from './live-owner-artifact.mjs';
const commit='a'.repeat(40);
for (const game of ['nte','lvmeng','azur-promilia']) {
const configText=readFileSync(new URL(`../apps/game-${game}/wrangler.jsonc`,import.meta.url),'utf8');
test(`${game}: exact target policy rejects unreviewed control-plane changes`,()=>{
 const target=liveOwnerConfig(game,configText);assert.equal(target.environment,game==='lvmeng'?'production':'');
 for(const mutate of [c=>{c.services=[];},c=>{c.routes=[];},c=>{c.vars.EXTRA='unknown';},c=>{c.env.extra={};},c=>{c.compatibility_date='2027-01-01';}]){
  const c=JSON.parse(configText);mutate(c);assert.throws(()=>liveOwnerConfig(game,JSON.stringify(c)));
 }
});
function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'genshin-artifact-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, 'source'), directory = join(root, 'sealed');
  const put = (path, value) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, value); };
  put(join(source, 'worker.js'), 'export default {}');
  put(join(source, '.build/open-next.config.edge.mjs'), 'export default {}');
  put(join(source, 'assets/BUILD_ID'), 'fixture-build');
  put(join(source, 'assets/_next/static/chunks/a.js'), 'fixture chunk');
  symlinkSync('assets/BUILD_ID', join(source, 'internal-link'));
  const previousAssets = { receiptSha256: 'b'.repeat(64), versionId: '472903c2-3fca-43c0-a613-8c54f108bf73' };
  const input = { game, directory, source, sourceCommit: commit, configText, previousAssets, sitemap: '<urlset/>', verification: { fixture: true } };
  const result = sealLiveOwnerArtifact(input);
  const options = { game, ...result, configText, previousAssets };
  return { directory, input, put, options, verify: () => verifyLiveOwnerArtifact(directory, options) };
}

test('seals the full portable artifact and separately pins the manifest identity', t => {
  const f = fixture(t);
  assert.equal(f.verify().sourceCommit, commit);
  assert.equal(f.verify().provenance, 'local_operator_build_and_integrity_not_remote_attestation');
  assert.equal(sha256(readFileSync(join(f.directory, 'manifest.json'))), f.options.manifestSha256);
  assert.throws(() => sealLiveOwnerArtifact(f.input), /EEXIST/);
});

test('execution config stays outside seal and selects the reviewed environment', t => {
 const f=fixture(t); const execution=liveOwnerExecutionConfig(f.directory,f.options);
 assert.equal(execution.main,join(f.directory,'.open-next/worker.js'));
 assert.equal(execution.assets.directory,join(f.directory,'.open-next/assets'));
 assert.equal(f.verify().environment,game==='lvmeng'?'production':'');
});

for (const [name, mutate] of Object.entries({
  chunk: f => f.put(join(f.directory, '.open-next/assets/_next/static/chunks/a.js'), 'modified chunk'),
  'extra file': f => f.put(join(f.directory, 'unreviewed.js'), 'extra'),
  'extra empty directory': f => mkdirSync(join(f.directory, 'extra')),
  'manifest change': f => f.put(join(f.directory, 'manifest.json'), '{}'),
  'target config': f => f.put(join(f.directory, 'wrangler.json'), '{}'),
  'missing file': f => rmSync(join(f.directory, '.open-next/assets/BUILD_ID')),
  'external link': f => symlinkSync('/etc/passwd', join(f.directory, '.open-next/escape')),
  'dangling link': f => symlinkSync('missing', join(f.directory, '.open-next/dangling')),
  'outside Worker link': f => symlinkSync('.open-next/assets/BUILD_ID', join(f.directory, 'alias')),
  'wrong commit': f => { f.options.sourceCommit = 'c'.repeat(40); },
  'wrong receipt': f => { f.options.previousAssets = {}; },
  'wrong pinned digest': f => { f.options.manifestSha256 = 'c'.repeat(64); },
  'changed source config': f => { f.options.configText += '\n'; },
})) test(`artifact verification rejects ${name}`, t => {
  const f = fixture(t); mutate(f); assert.throws(f.verify);
});


}
const importTs=async path=>import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'));
for(const game of ['nte','lvmeng','azur-promilia']) test(`${game} preview host guard cannot be spoofed by path or userinfo`,async()=>{
 const {isWorkerPreviewOrigin}=await importTs(`../apps/game-${game}/lib/preview-origin.ts`);
 assert.equal(isWorkerPreviewOrigin(`https://1234abcd-gachia-game-${game}.aieasygames.workers.dev`),true);
 for(const url of ['https://gachia.com','https://workers.dev.evil.invalid','https://gachia.com/path.workers.dev','https://name.workers.dev@evil.invalid','invalid'])assert.equal(isWorkerPreviewOrigin(url),false);
});
test('Azur production artifact policy preserves production mode and existing service grouping', () => {
 const text=readFileSync(new URL('../apps/game-azur-promilia/wrangler.jsonc',import.meta.url),'utf8');
 const target=liveOwnerConfig('azur-promilia',text);
 assert.equal(target.mode,'production');
 assert.equal(target.config.vars.AZUR_PROMILIA_DEPLOYMENT_MODE,'production');
 assert.deepEqual(target.config.env,JSON.parse(text).env);
 assert.equal(target.config.workers_dev,true);
 for(const mutate of [c=>{c.vars.AZUR_PROMILIA_DEPLOYMENT_MODE='preview';},c=>{c.env.staging.vars.AZUR_PROMILIA_DEPLOYMENT_MODE='production';},c=>{c.workers_dev=false;}]) {
  const c=JSON.parse(text);mutate(c);assert.throws(()=>liveOwnerConfig('azur-promilia',JSON.stringify(c)));
 }
});
test('Azur sealed configuration preserves the service tag under installed Wrangler semantics', t => {
 const require=createRequire(new URL('../apps/game-azur-promilia/package.json',import.meta.url));
 const {unstable_readConfig}=require('wrangler');
 const root=mkdtempSync(join(tmpdir(),'azur-service-tag-'));
 t.after(()=>rmSync(root,{recursive:true,force:true}));
 const text=readFileSync(new URL('../apps/game-azur-promilia/wrangler.jsonc',import.meta.url),'utf8');
 const target=liveOwnerConfig('azur-promilia',text),path=join(root,'wrangler.json');
 writeFileSync(path,JSON.stringify(target.config));
 const parsed=unstable_readConfig({config:path,env:target.environment});
 assert.equal(parsed.name,'gachia-game-azur-promilia');
 assert.equal(parsed.targetEnvironment,'');
 assert.deepEqual(parsed.definedEnvironments,['staging']);
 assert.equal(parsed.vars.AZUR_PROMILIA_DEPLOYMENT_MODE,'production');
 // Exercise the pinned CLI's actual tag transformation, not a copied model.
 const source=readFileSync(require.resolve('wrangler'),'utf8');
 const start=source.indexOf('function hasDefinedEnvironments(config2) {');
 const end=source.indexOf('function warnOnErrorUpdatingServiceAndEnvironmentTags()',start);
 assert(start>=0&&end>start,'Installed Wrangler tag helper changed; review before release');
 const applyTags=new Function('SERVICE_TAG_PREFIX','ENVIRONMENT_TAG_PREFIX','logger',source.slice(start,end)+'; return applyServiceAndEnvironmentTags;')('cf:service=','cf:environment=',{warn:message=>assert.fail(message)});
 const tags=['cf:service=gachia-game-azur-promilia'];
 assert.deepEqual(applyTags(parsed,tags),tags);
 const {env:_env,...stripped}=target.config;
 writeFileSync(path,JSON.stringify(stripped));
 assert.deepEqual(applyTags(unstable_readConfig({config:path,env:''}),tags),[]);
});
test('Azur middleware blocks Worker hosts without trusting forwarded-host or changing public indexing', async () => {
 const require=createRequire(new URL('../apps/game-azur-promilia/package.json',import.meta.url));
 const {NextRequest}=require('next/server');
 const helper=await importTs('../apps/game-azur-promilia/lib/preview-origin.ts');
 const source=readFileSync(new URL('../apps/game-azur-promilia/middleware.ts',import.meta.url),'utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};
 new Function('require','exports',compiled)(name=>name==='./lib/preview-origin'?helper:require(name),exports);
 for(const host of ['gachia-game-azur-promilia.aieasygames.workers.dev','abcd1234-gachia-game-azur-promilia.aieasygames.workers.dev','gachia-game-azur-promilia-staging.aieasygames.workers.dev']) {
  for(const path of ['/robots.txt','/sitemap.xml','/zh/azur-promilia','/missing']) {
   const response=exports.middleware(new NextRequest(`https://${host}${path}`,{headers:{'x-forwarded-host':'gachia.com'}}));
   assert.equal(response.headers.get('x-robots-tag'),'noindex, nofollow');
   if(path==='/robots.txt') assert.equal(await response.text(),'User-agent: *\nDisallow: /\n');
  }
 }
 for(const host of ['gachia.com','workers.dev.evil.invalid']) {
  const response=exports.middleware(new NextRequest(`https://${host}/robots.txt`,{headers:{'x-forwarded-host':'fake.workers.dev'}}));
  assert.equal(response.headers.get('x-robots-tag'),null);
  assert.equal(response.headers.get('x-middleware-next'),'1');
 }
 assert.doesNotMatch(source,/process.env/);
});
test('Lvmeng progress keeps old and unknown string IDs but rejects malformed or unbounded state',async()=>{
 const {parseVerificationProgress:parse}=await importTs('../apps/game-lvmeng/lib/verification-progress.ts');
 assert.deepEqual(parse('["version","future-id","version",null,1,{},""]'),['version','future-id']);
 for(const raw of [null,'','{','null','{}','3','"version"',' '.repeat(256*1024+1)])assert.deepEqual(parse(raw),[]);
 assert.equal(parse(JSON.stringify(Array.from({length:2100},(_,i)=>`id-${i}`))).length,2000);
 assert.deepEqual(parse(JSON.stringify(['a'.repeat(129),'version'])),['version']);
});
