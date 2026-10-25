import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import ts from 'typescript';
import { liveOwnerConfig, liveOwnerExecutionConfig, sealLiveOwnerArtifact, sha256, verifyLiveOwnerArtifact } from './live-owner-artifact.mjs';
const commit='a'.repeat(40);
for (const game of ['nte','lvmeng']) {
const configText=readFileSync(new URL(`../apps/game-${game}/wrangler.jsonc`,import.meta.url),'utf8');
test(`${game}: exact target policy rejects unreviewed control-plane changes`,()=>{
 const target=liveOwnerConfig(game,configText);assert.equal(target.environment,game==='nte'?'':'production');
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
 assert.equal(f.verify().environment,game==='nte'?'':'production');
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
for(const game of ['nte','lvmeng']) test(`${game} preview host guard cannot be spoofed by path or userinfo`,async()=>{
 const {isWorkerPreviewOrigin}=await importTs(`../apps/game-${game}/lib/preview-origin.ts`);
 assert.equal(isWorkerPreviewOrigin(`https://1234abcd-gachia-game-${game}.aieasygames.workers.dev`),true);
 for(const url of ['https://gachia.com','https://workers.dev.evil.invalid','https://gachia.com/path.workers.dev','https://name.workers.dev@evil.invalid','invalid'])assert.equal(isWorkerPreviewOrigin(url),false);
});
test('Lvmeng progress keeps old and unknown string IDs but rejects malformed or unbounded state',async()=>{
 const {parseVerificationProgress:parse}=await importTs('../apps/game-lvmeng/lib/verification-progress.ts');
 assert.deepEqual(parse('["version","future-id","version",null,1,{},""]'),['version','future-id']);
 for(const raw of [null,'','{','null','{}','3','"version"',' '.repeat(256*1024+1)])assert.deepEqual(parse(raw),[]);
 assert.equal(parse(JSON.stringify(Array.from({length:2100},(_,i)=>`id-${i}`))).length,2000);
 assert.deepEqual(parse(JSON.stringify(['a'.repeat(129),'version'])),['version']);
});
