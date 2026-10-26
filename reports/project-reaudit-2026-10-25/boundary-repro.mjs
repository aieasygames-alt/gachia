import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import assert from 'node:assert/strict';
import { createReleasePlan, checkExecutionPermission, checkSourcePermission } from '../../scripts/game-release.mjs';
const requireWeb = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const next = requireWeb('next/server');
function load(file, mocks, extra = {}) {
  const source = readFileSync(file, 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => {
    if (name === 'next/server') return next;
    if (Object.hasOwn(mocks, name)) return mocks[name];
    throw Error(`Unexpected import ${name}`);
  }, URL, Response, Request, Headers, console, ...extra }, { filename: file });
  return exports;
}
const middleware = load('apps/web/middleware.ts', {
  'next-intl/middleware': () => () => next.NextResponse.next(),
  './lib/i18n/routing': { routing: {} },
  '@gachia/core': { GAME_IDS: ['genshin','nte','lvmeng','azur-promilia'], LOCALES: ['zh','en','ja'] },
  './lib/preview-origin': { isWorkerPreviewOrigin: () => false },
  './lib/retired-pages': { isRetiredPage: () => false },
}).default;
const paths = ['/zh/%', '/zh/%E0%A4%A', '/zh/%E4%BD%A0'];
const middlewareResults = paths.map(path => {
  const url='https://gachia.com'+path;
  try {const r=middleware(new next.NextRequest(url));return {path,status:r.status,location:r.headers.get('location'),selfRedirect:r.headers.get('location')===url};}
  catch(e){return {path,error:e.name,message:e.message};}
});
assert.equal(middlewareResults[0].error,'URIError');assert.equal(middlewareResults[1].error,'URIError');assert.equal(middlewareResults[2].selfRedirect,true);
const cache=new Map(); let fetches=0;const writes=[];
const tile=load('apps/web/app/api/map/tile/route.ts', {
  '@/lib/db': {getR2:()=>({get:async key=>cache.has(key)?{body:cache.get(key)}:null,put:async (key,bytes)=>{cache.set(key,bytes);writes.push(key);}})},
  '@opennextjs/cloudflare':{getCloudflareContext:()=>({ctx:{waitUntil:()=>{}}})},
},{fetch:async url=>{fetches++;const body=new TextEncoder().encode(String(url));return new Response(body,{headers:{'content-type':'image/png','content-length':String(body.length)}})}}).GET;
const urls=['https://act-webstatic.hoyoverse.com/map_manage/20261025/Aa.png','https://act-webstatic.hoyoverse.com/map_manage/20261025/BB.png'];
const tileResults=[];
for(const url of urls){const response=await tile(new Request('https://gachia.com/api/map/tile?map_id=2&url='+encodeURIComponent(url)));tileResults.push({url,status:response.status,cache:response.headers.get('x-cache'),body:await response.text()});}
assert.equal(fetches,1);assert.equal(tileResults[1].body,urls[0]);assert.equal(tileResults[1].cache,'HIT');
const plan=createReleasePlan({game:'nte',environment:'production',rollbackVersion:'00000000-0000-0000-0000-000000000000'},readFileSync('apps/game-nte/wrangler.jsonc','utf8'));
checkExecutionPermission(plan,{action:'deploy',confirmation:plan.service});checkSourcePermission(plan,{action:'deploy'},{dirty:true,commit:'dirty',expectedCommit:'different'});
const expiredBuild={id:'synthetic-expired',userId:'synthetic-internal-user',gameId:'genshin',characterId:'synthetic',buildData:'{}',expiresAt:'2020-01-01T00:00:00.000Z'};
const query={from:()=>query,where:()=>query,limit:async()=>[expiredBuild]};
const shared=load('apps/web/app/api/shared-builds/route.ts',{
  '@/lib/site-features':{accountFeatureUnavailable:()=>new Response('',{status:404})},
  '@/lib/db':{getDb:()=>({select:()=>query})},
  '@gachia/db':{sharedBuilds:{id:'id'},eq:(field,value)=>({field,value})},
  '@/lib/auth':{createAuth:()=>{throw Error('Unexpected auth');}},
  '@/lib/rate-limit':{checkRateLimit:()=>{throw Error('Unexpected rate call');}},
  'crypto':{randomUUID:()=>{throw Error('Unexpected creation');}},
  '@gachia/core':{GAME_IDS:['genshin']},
}).GET;
const sharedResponse=await shared(new next.NextRequest('https://gachia.com/api/shared-builds?id=synthetic-expired'));
const sharedResult={status:sharedResponse.status,cacheControl:sharedResponse.headers.get('cache-control'),body:await sharedResponse.json()};
assert.equal(sharedResult.status,200);assert.equal(sharedResult.body.userId,expiredBuild.userId);assert.equal(sharedResult.body.expiresAt,expiredBuild.expiresAt);
const result={scope:'Local synthetic inputs only; actual route source transpiled with mocked DB/upstream and middleware surrounding dependencies. No network, real DB, or deployment.',middleware:middlewareResults,expiredSharedBuild:sharedResult,tile:{fetches,writes,responses:tileResults},nteGate:{dirtySourceAccepted:true,syntheticRollbackUuidAccepted:true,previousAssetsRequired:false}};
writeFileSync('.release-records/project-reaudit-2026-10-25/boundary-repro.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
