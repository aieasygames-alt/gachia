// Qualification only; no credentials, upload, deployment, or content write.
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import path from 'node:path'
import {migrationPinned,migrationSave} from '../../scripts/genshin-migration-http.mjs'
import {digest} from '../../scripts/desktop-release-assets.mjs'
import {recheckNteReferences} from '../../scripts/nte-release-http.mjs'
import {captureUnifiedExecutorSource} from '../../services/content-cms/src/unified-executor-source.ts'
const root=import.meta.dirname,repo=path.resolve(root,'../..'),load=(file:string)=>JSON.parse(readFileSync(path.join(root,file),'utf8'))
const executor=captureUnifiedExecutorSource(repo),s=load('sealed-qa.json'),original=load('sealed-modules-final.json'),p=load('prepared-final.json')
assert.equal(s.commit,executor.commit);assert.equal(p.commit,s.commit);assert.equal(original.commit,s.commit)
const all=[]
for(const owner of ['genshin','nte','azur-promilia','lvmeng','main']){
 for(const role of ['candidate','recovery']){
  const {local,...row}=s.owners[owner][role];assert.deepEqual(row,original.owners[owner][role]);const refs=recheckNteReferences(local);all.push({owner,role,requests:refs.length})
 }
 const refs=recheckNteReferences(s.publicReferences[owner]);assert(!refs.some(row=>/^\/(?:en|ja)\/lvmeng$/.test(row.path)))
}
const graph=recheckNteReferences(s.graph);for(const file of ['games.json','search-zh.json','search-en.json','search-ja.json'])assert(graph.some(row=>row.path==='/data-manifest/'+file&&row.status===200))
for(const row of load('locale-boundary-before.json'))assert.equal(row.status,404)
assert.equal(load('json-preservation.json').status,'passed')
const browser=load('browser-acceptance.json');assert.equal(browser.status,'passed');assert.equal(browser.results.length,5)
const proof=(file:string)=>({path:path.join(root,file),pin:digest(readFileSync(path.join(root,file)))})
const sealed=migrationSave(root,'sealed.json',s)
migrationSave(root,'local-qualification.json',{commit:executor.commit,compiledCommit:p.compiledCommit,sealed,owners:all,graphRequests:graph.length,
 browser:proof('browser-acceptance.json'),json:proof('json-preservation.json'),localeBoundary:proof('locale-boundary-before.json'),
 graphProducer:proof('local-consumers-final.mts'),browserProducer:proof('browser-continued.mjs'),browserRuntime:proof('browser-runtime-current.mjs'),
 limits:'Router runs as its exact published module in Node with HTTP bindings to five real workerd processes. Non-Chinese Lvmeng paths use their existing exact Router 404 boundary, independently of owner HTML 404 references.'})
executor.verify();console.log(JSON.stringify({qualified:true,directChecks:all.reduce((a,r)=>a+r.requests,0),graph:graph.length,browserGames:5}))
