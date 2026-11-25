import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { multipartModule } from '../../scripts/desktop-cloud-transport.mjs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { unifiedDryRun, unifiedTransportTool } from '../../scripts/unified-cloud-module.mjs';
const root=import.meta.dirname,repo=path.resolve(root,'../..');
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const previous=path.join(repo,'reports/starrail-warp-cones-2026-11-25');
const oldConfig=JSON.parse(fs.readFileSync(path.join(previous,'module/upload.json')));
const oldState=JSON.parse(fs.readFileSync(path.join(root,'runtime-before.json')));
const deployment=oldState.gachia.deployments.deployments.sort((a,b)=>a.created_on.localeCompare(b.created_on)).at(-1);
assert.deepEqual(deployment.versions,[{version_id:'ec6a2e3e-80d2-4e1b-8239-9169fc02055e',percentage:100}]);
assert.equal(hash(oldConfig.main),'2471c14aeb0c882d081dbb3948d816bbeda1719b8d94d50ccab1a2892aa9e5b3');
assert(!fs.existsSync(path.join(root,'artifact')));
fs.cpSync(path.join(repo,'apps/web/.open-next'),path.join(root,'artifact'),{recursive:true});
const oldStatic=path.join(oldConfig.assets.directory,'_next/static'), newStatic=path.join(root,'artifact/assets/_next/static');
let copied=0, oldCount=0;
function retain(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
 const from=path.join(dir,entry.name); assert(!entry.isSymbolicLink());
 if(entry.isDirectory())retain(from);else{
  assert(entry.isFile());oldCount++;
  const to=path.join(newStatic,path.relative(oldStatic,from));
  if(fs.existsSync(to))assert.equal(hash(from),hash(to),'Immutable asset collision');
  else {fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(from,to);copied++;}
 }
}}
retain(oldStatic);
fs.mkdirSync(path.join(root,'module'));fs.mkdirSync(path.join(root,'.private/dry-home'),{recursive:true});
const config={...oldConfig,main:path.join(root,'artifact/worker.js'),assets:{...oldConfig.assets,directory:path.join(root,'artifact/assets')},minify:true};
delete config.no_bundle;
const compilePath=path.join(root,'module/compile.json');fs.writeFileSync(compilePath,JSON.stringify(config,null,2));
const tool=unifiedTransportTool(repo);
unifiedDryRun(tool,{config:compilePath,environment:'',outfile:path.join(root,'module/compiled.multipart'),exact:false,cwd:path.join(repo,'apps/web'),home:path.join(root,'.private/dry-home'),log:path.join(root,'module/compile.log')});
const compiled=await multipartModule(fs.readFileSync(path.join(root,'module/compiled.multipart')));
fs.writeFileSync(path.join(root,'module/worker.js'),compiled.code);
fs.writeFileSync(path.join(root,'module/metadata.json'),JSON.stringify(compiled.metadata,null,2));
const exact={...config,main:path.join(root,'module/worker.js'),no_bundle:true,minify:false};
fs.writeFileSync(path.join(root,'module/upload.json'),JSON.stringify(exact,null,2));
const receipt={sourceCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim(),previousVersion:deployment.versions[0].version_id,previousModuleSHA256:hash(oldConfig.main),moduleSHA256:hash(exact.main),configSHA256:hash(path.join(root,'module/upload.json')),staticRetention:{previous:oldCount,copied,allCollisionsIdentical:true},tool};
fs.writeFileSync(path.join(root,'runtime-prepared.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt));
