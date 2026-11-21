// Pure qualification: run the exact published Router against previously
// captured real workerd HTML responses. No network, cloud or content writes.
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {digest} from '../../scripts/desktop-release-assets.mjs'
import {migrationPinned,migrationSave} from '../../scripts/genshin-migration-http.mjs'
import {recheckNteReferences,saveNteReferenceProof} from '../../scripts/nte-release-http.mjs'
const root=import.meta.dirname,load=(name:string)=>JSON.parse(readFileSync(path.join(root,name),'utf8'))
const original=load('sealed.json'),before=load('baseline.json').before
const parent=JSON.parse(readFileSync(original.parent.path,'utf8')),receipt=migrationPinned(parent.router.moduleProof)
const file=path.join(root,'candidate-graph-bounded/published-router.mjs'),bytes=readFileSync(file)
assert.equal(digest(bytes),receipt.moduleSHA256)
const router=(await import(pathToFileURL(file).href)).default
const vars=Object.fromEntries(before.bindings['gachia-router'].filter((row:any)=>row.type==='plain_text').map((row:any)=>[row.name,row.text]))
const ownerBinding:Record<string,string>={genshin:'GENSHIN_SITE',nte:'NTE_SITE','azur-promilia':'AZUR_PROMILIA_SITE',lvmeng:'LVMENG_SITE',main:'MAIN_SITE'}
const references:any={},counts:any=[]
for(const owner of Object.keys(ownerBinding)){
 const oldProof=original.publicReferences[owner],oldRows=recheckNteReferences(oldProof),directory=path.join(root,'public-reference-routed-'+owner)
 mkdirSync(directory);let projected=0,changed=0
 const rows=[]
 for(const [index,row] of oldRows.entries()){
  const body=readFileSync(path.join(path.dirname(oldProof.path),row.bodyFile));let output=row
  if(row.status===200&&row.headers['content-type']?.includes('text/html')){
   let calls=0
   const env:any={...vars}
   for(const binding of Object.values(ownerBinding))env[binding]={fetch:async(request:Request)=>{
    assert.equal(binding,ownerBinding[owner],'Published Router selected another owner');assert.equal(++calls,1)
    assert.equal(new URL(request.url).pathname,row.path);assert.equal(request.method,'GET')
    return new Response(body,{status:row.status,headers:row.headers})
   }}
   const response=await router.fetch(new Request('https://gachia.com'+row.path),env,{waitUntil(p:Promise<any>){p.catch(()=>{})},passThroughOnException(){}})
   assert.equal(calls,1);assert.equal(response.status,row.status)
   const actual=Buffer.from(await response.arrayBuffer());assert(actual.equals(body),'Router changed rendered bytes')
   const headers=Object.fromEntries(response.headers)
   // Only the exact Router response header difference is projected. Every
   // body, fingerprint, MIME, robots field, JSON pin and static hash is kept.
   for(const key of new Set([...Object.keys(row.headers),...Object.keys(headers)]))if(key!=='cache-control')assert.equal(headers[key],row.headers[key],key)
   if(headers['cache-control']!==row.headers['cache-control'])changed++
   output={...row,headers};projected++
  }
  writeFileSync(path.join(directory,index+'.body'),body,{flag:'wx',mode:0o600});rows.push(output)
 }
 references[owner]=saveNteReferenceProof(directory,rows);recheckNteReferences(references[owner]);counts.push({owner,requests:rows.length,htmlProjected:projected,cacheHeadersChanged:changed})
}
const qualified=migrationSave(root,'sealed-public.json',{...original,publicReferences:references})
migrationSave(root,'public-reference-qualification.json',{status:'passed',mode:'exact_published_router_on_archived_real_workerd_html_responses',
 originalSealed:{path:path.join(root,'sealed.json'),pin:digest(readFileSync(path.join(root,'sealed.json')))},qualifiedSealed:qualified,
 routerModule:{path:file,pin:digest(bytes)},routerSource:parent.router.moduleProof,counts,
 bodyFingerprintsChanged:false,validatorChanged:false,nonHTMLReferencesChanged:false,cloudWrites:0})
console.log(JSON.stringify({qualified:true,counts,sealed:qualified}))
