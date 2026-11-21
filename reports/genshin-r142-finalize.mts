import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync,readFileSync,writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import path from 'node:path'
import { auditMaterialReleaseDependencies } from '../services/content-cms/src/material-release-dependencies.ts'
import { canonical } from '../services/content-cms/src/record-mapping.ts'
const repo=path.resolve(import.meta.dirname,'..'),root=path.join(repo,'reports/genshin-collection-review-2026-11-21-r142')
const hash=(bytes:any)=>createHash('sha256').update(bytes).digest('hex')
const proof=(name:string)=>{const file=path.join(root,name);return {path:file,pin:hash(readFileSync(file))}}
const load=(name:string)=>JSON.parse(readFileSync(path.join(root,name),'utf8'))
const save=(name:string,value:any)=>{const file=path.join(root,name);if(existsSync(file))assert.equal(canonical(JSON.parse(readFileSync(file,'utf8'))),canonical(value),'Existing closeout evidence differs');else writeFileSync(file,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});return proof(name)}
const first=load('installed-export-form.json'),second=load('installed-export-form-reopen.json');assert.equal(canonical(first.result),canonical(second.result))
const exported=first.result,preparation=load('preparation.json'),direct=load('consumer-direct.json'),graph=load('consumer-graph.json')
assert.equal(exported.manifest.runKey,preparation.runKey);assert.equal(exported.manifest.changedPaths.length,4)
assert.equal(exported.sources.length,115);assert.equal(exported.manifest.decisions.length,221)
const before=load('database-before-install.json'),after=load('database-final.json')
const changed=Object.keys(after).filter(name=>canonical(before[name]??null)!==canonical(after[name]))
assert.deepEqual(changed.sort(),['genshin_review_decisions','migration_batches','migration_records','payload_migrations','users_sessions'].sort())
assert.equal(after.genshin_review_decisions.rows,221);assert.equal(after.migration_records.rows-before.migration_records.rows,221)
const tableDelta=save('database-delta.json',{newTables:['genshin_review_decisions'],changed:changed.map(name=>({name,before:before[name]??null,after:after[name]})),unchangedExistingTables:Object.keys(before).filter(name=>!changed.includes(name)),contentAndVersionsExactlyPreserved:true,loginSessionsAdded:after.users_sessions.rows-before.users_sessions.rows})
const candidate=auditMaterialReleaseDependencies('genshin',exported.sources),recovery=auditMaterialReleaseDependencies('genshin',exported.recoverySources)
assert(candidate.dependencyClosureComplete);assert.equal(candidate.materialReferences,5490);assert(!recovery.dependencyClosureComplete)
save('dependency-and-recovery.json',{candidate,recovery,recoveryPolicy:'exact-published-A-preserves-existing-gaps'})
const sourceIndex=exported.manifest.sourceIndex,index=JSON.parse(readFileSync(sourceIndex.path,'utf8'));assert.equal(hash(readFileSync(sourceIndex.path)),sourceIndex.pin)
const preservation=save('preservation.json',{sourceIndex,changedPaths:exported.manifest.changedPaths,derivedSources:exported.manifest.derivedSources,
 untouched:exported.sources.filter((row:any)=>!exported.manifest.changedPaths.includes(row.sourcePath)).map((row:any)=>{const old=exported.recoverySources.find((a:any)=>a.sourcePath===row.sourcePath);assert.equal(canonical(row),canonical(old));return {sourcePath:row.sourcePath,sha256:row.sha256}}),
 retained:['Hu Tao published text','NTE Sakiri and Collector material text','Zero canonical relations','27 unconfirmed NTE materials and 441 references remain deleted','five guide increments','held historical evidence'],productionSourceAdvanced:false,contentRecordWrites:0})
const packed=path.join(root,'collection-export-final.json.gz');writeFileSync(packed,gzipSync(Buffer.from(JSON.stringify(first)+'\n')),{flag:'wx',mode:0o600})
const checks:any={}
for(const[mode,refs]of Object.entries({candidateDirect:direct.candidate,recoveryDirect:direct.recovery,candidateGraph:graph.candidate,recoveryGraph:graph.recovery})){
 const ref:any=refs;assert.equal(hash(readFileSync(ref.path)),ref.pin);checks[mode]={proof:ref,requests:JSON.parse(readFileSync(ref.path,'utf8')).length}
}
const acceptance=save('acceptance.json',{checks,totalRequests:Object.values(checks).reduce((sum:number,row:any)=>sum+row.requests,0),
 candidate:load('candidate-direct/source-derived-acceptance-final.json'),recovery:load('recovery-direct/source-derived-acceptance-final.json'),
 routerRuntime:load('candidate-graph-04/runtime.json'),recoveryRouterRuntime:load('recovery-graph-04/runtime.json'),
 completeNextOpenNextBuild:proof('game-built.json'),compatibility:proof('consumer-sealed.json'),noProductionDeployment:true})
const receipts=['preparation.json','cms-capture-proof.json','cms-final-proof.json','rest-review-readback.json','installed-stage.json','installed-stage-repeat.json','installed-decide.json','installed-decide-repeat.json','installed-verify-final.json','installed-export-final.json','installed-export-final-reopen.json',
 'application-installed.json','cold-backup.json','application-refresh-01/application-installed.json','application-refresh-01/cold-backup.json','application-form-02/application-installed.json','application-form-02/cold-backup.json','installed-verify-form.json','installed-export-form.json','installed-export-form-reopen.json','owner-build-reuse.json','consumer-prepared.json','consumer-sealed.json','consumer-direct.json','consumer-graph.json','game-build-budget.json','game-build-budget-02.json','game-dependency-reuse.json','source-read.json',
 'EXECUTION.md','../r142-focused-01.log','../r142-review-sqlite-04.log','../r142-review-postgres-final.log','../r142-docs-assets-01.log','../r142-types-final.log','final-build-cleanup-result.json','compression-result-01.json','compression-result.json','source-build-cleanup-result.json','database-final.json']
const delivery={kind:'genshin-collection-review-delivery-r142',status:'installed-reviewed-complete-export-and-local-consumer-recovery-qualified',parentDelivery:preparation.parent,
 sourceIndex,sourceCommit:first.sourceCommit,runKey:preparation.runKey,stageKey:preparation.stageKey,exportKey:exported.manifest.exportKey,
 installedApplication:proof('application-form-02/application-installed.json'),cmsAfter:load('cms-final-proof.json').proof,input:preparation.input,
 completeExport:{path:packed,pin:hash(readFileSync(packed))},exportManifest:exported.manifest,
 independentReviewDecisions:221,stagedStructuralRevisionsReused:179,existingSavedDraftsReused:42,reviewComparisonsCreated:221,
 contentRecordWrites:0,workerUploads:0,productionDeployments:0,sourceAdvanced:false,
 checks:{focused:22,sqlite:10,isolatedPostgres:10,docsAndAssets:81,types:true,standardCMSBuild:true,completeGenshinBuild:true,localHTTP:7658,skipped:0},
 acceptance,preservation,tableDelta,evidence:Object.fromEntries(receipts.map(name=>[name,proof(name)])),
 next:'Resume the existing 221 reviews and this complete export; do not replay the 42 drafts, 179 staged structural revisions or review decisions. Wire this new collection contract into cloud preview and controlled single-Genshin production qualification. R139 remains the published source.',
 pending:['cloud preview and production qualification for the new structural collection contract','controlled production source/CMS editing-source advance','Next.js 16.4.2 security advisory remediation'],productionReady:false}
save('delivery-final.json',delivery)
console.log(JSON.stringify({status:delivery.status,exportKey:delivery.exportKey,localHTTP:acceptance,contentWrites:0,deployments:0}).slice(0,500))
