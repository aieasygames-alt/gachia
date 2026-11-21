import assert from 'node:assert/strict'
import { readFileSync,writeFileSync } from 'node:fs'
import path from 'node:path'
import { homedir } from 'node:os'
import { digest } from '../services/content-cms/src/legacy-intake.ts'
import { canonical } from '../services/content-cms/src/record-mapping.ts'
import { prepareGenshinCollectionReview } from '../services/content-cms/src/genshin-collection-review.ts'
const root=path.resolve(import.meta.dirname,'genshin-collection-review-2026-11-21-r142'), origin='http://127.0.0.1:3100'
const preparation=JSON.parse(readFileSync(path.join(root,'preparation.json'),'utf8'))
const bytes=readFileSync(preparation.input.path);assert.equal(digest(bytes.toString()),preparation.input.pin)
const input=JSON.parse(bytes.toString()), review=prepareGenshinCollectionReview(input)
const credentials=readFileSync(path.join(homedir(),'Library/Application Support/GachiaCMS/initial-admin.txt'),'utf8')
const email=credentials.match(/^Email: (.+)$/m)?.[1],password=credentials.match(/^Password: (.+)$/m)?.[1];assert(email&&password)
const login=await fetch(origin+'/api/users/login',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({email,password})});assert.equal(login.status,200)
const {token}=await login.json();assert(token)
async function read(collection:string,where:Record<string,string>){
 const response=await fetch(origin+'/api/'+collection+'?'+new URLSearchParams({depth:'0',limit:'1000',sort:'id',...where}),{headers:{origin,authorization:`JWT ${token}`},signal:AbortSignal.timeout(30000)})
 assert.equal(response.status,200);const result=await response.json();assert.equal(result.hasNextPage,false);assert.equal(result.docs.length,result.totalDocs);return result.docs
}
const items=await read('migration-records',{'where[family][contains]':'collection-review/'})
assert.equal(items.length,221)
for(const row of items){const expected=review.items.find(item=>item.revisionKey===row.revisionKey);assert(expected);assert.equal(canonical(Object.fromEntries(Object.keys(expected).map(key=>[key,row[key]]))),canonical(expected))}
const batches=await read('migration-batches',{'where[batchKey][equals]':review.runKey});assert.equal(batches.length,1);assert.equal(batches[0].manifest,canonical(review.manifest))
const decisions=await read('genshin-review-decisions',{'where[runKey][equals]':review.runKey});assert.equal(decisions.length,221)
for(const row of decisions){assert.equal(row.action,'accept-export');assert.equal(row.cmsKey,review.manifest.cmsKey);assert.equal(row.actorID,'1');assert.equal(row.decisionKey,digest(review.runKey+'\0'+row.revisionKey));assert(items.some(item=>item.id===row.reviewItem&&item.revisionKey===row.revisionKey))}
const first=JSON.parse(readFileSync(path.join(root,'installed-export-final.json'),'utf8')).result, second=JSON.parse(readFileSync(path.join(root,'installed-export-final-reopen.json'),'utf8')).result
assert.equal(canonical(first),canonical(second));assert.equal(first.sources.length,115);assert.equal(first.manifest.changedPaths.length,4)
for(const decision of first.manifest.decisions){const row=decisions.find(row=>row.revisionKey===decision.revisionKey);assert(row);assert.equal(canonical(Object.fromEntries(Object.keys(decision).map(key=>[key,row[key]]))),canonical(decision))}
const anonymous=await fetch(origin+'/api/genshin-review-decisions?limit=1');assert([401,403].includes(anonymous.status))
const result={runKey:review.runKey,items:221,decisions:221,reviewBatch:batches[0].id,decisionIds:decisions.map(({id,revisionKey})=>({id,revisionKey})),exactStoredComparisons:true,exactIndependentExport:true,exportKey:first.manifest.exportKey,changedPaths:first.manifest.changedPaths,anonymousStatus:anonymous.status,contentWrites:0,observedAt:new Date().toISOString()}
writeFileSync(path.join(root,'rest-review-readback.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({items:221,decisions:221,exportKey:first.manifest.exportKey,contentWrites:0}))
