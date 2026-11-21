import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { existsSync,mkdirSync,readFileSync,writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { withLocalWorker } from '../scripts/desktop-publish.mjs'
import { digest } from '../scripts/desktop-release-assets.mjs'
import { migrationPinned,migrationSave } from '../scripts/genshin-migration-http.mjs'
import { genshinContentAssets } from '../scripts/genshin-content-assets.mjs'
import { nteLocalConfig,nteRequests } from '../services/content-cms/src/nte-release-bundle.ts'
import { captureNteHTTP,recheckNteReferences } from '../scripts/nte-release-http.mjs'
import { materialConsumerContract,assertMaterialPageConsumer,assertMaterialSearchConsumer } from '../services/content-cms/src/material-consumer-contract.ts'
import { unifiedStaticFiles } from '../scripts/unified-release-assets.mjs'
const repo=path.resolve(import.meta.dirname,'..'),root=path.join(repo,'reports/genshin-collection-review-2026-11-21-r142')
const load=(name:string)=>JSON.parse(readFileSync(path.join(root,name),'utf8'))
const p=load('consumer-prepared.json'),sealed=load('consumer-sealed.json'),exported=load('installed-export-final.json').result,index=migrationPinned(exported.manifest.sourceIndex)
function config(workspace:string,owner:string){const file=owner==='main'?'apps/web/wrangler.jsonc':owner==='router'?'apps/router/wrangler.jsonc':`apps/game-${owner}/wrangler.jsonc`;const value=JSON.parse(readFileSync(path.join(workspace,file),'utf8').replace(/^\s*\/\/.*$/gm,''));delete value.env;value.find_additional_modules=false;const service=owner==='main'?'gachia':`gachia-${owner==='router'?'router':'game-'+owner}`,settings=index.baseline.settings[service];assert(settings);value.vars=Object.fromEntries(settings.bindings.filter((row:any)=>row.type==='plain_text').map((row:any)=>[row.name,row.text]));value.services=settings.bindings.filter((row:any)=>row.type==='service').map((row:any)=>({binding:row.name,service:row.service}));return value}
const routerFile=path.join(root,'published-router-runtime.mjs'),routerBytes=readFileSync(path.join(repo,'reports/genshin-code-production-2026-11-20-r139/router.js'))
assert.equal(digest(routerBytes),migrationPinned(index.router.moduleProof).moduleSHA256)
if(!existsSync(routerFile))writeFileSync(routerFile,routerBytes,{flag:'wx',mode:0o600});const router=(await import(pathToFileURL(routerFile).href)).default
const unused=path.join(root,'unused-worker.mjs');if(!existsSync(unused))writeFileSync(unused,'export default {fetch(){return new Response(null,{status:503})}}',{flag:'wx',mode:0o600})
const results:any={},other=new Map<string,string>()
for(const role of ['candidate','recovery']){
 const workspace=migrationPinned(role==='candidate'?p.candidate:p.recovery).workspace,sourceRows=role==='candidate'?exported.sources:exported.recoverySources
 const directory=path.join(root,role+'-graph-04');mkdirSync(directory);mkdirSync(path.join(directory,'home'))
 const configs:any={}
 for(const owner of ['main','nte','genshin']){
  const row=owner==='genshin'?sealed.roles[role]:index.owners[owner],artifact=owner==='genshin'?row.artifact:row.directory
  const module=owner==='genshin'?path.join(root,'sealed/genshin',role,'module/worker.js'):path.join(artifact,'worker.js')
  if(owner!=='genshin')assert.equal(digest(readFileSync(module)),row.moduleSHA256)
  configs[owner]=migrationSave(directory,owner+'.json',{...nteLocalConfig(config(workspace,owner),owner,artifact,module),find_additional_modules:false}).path
 }
 configs.unused=migrationSave(directory,'unused.json',{name:'nte-release-unused',main:unused,compatibility_date:'2026-07-08',find_additional_modules:false}).path
 const wanted=await nteRequests(workspace,'router','candidate',undefined,false,sourceRows,undefined,index.owners.main.directory)
 const add=(row:any)=>{if(!wanted.requests.some((item:any)=>item.path===row.path))wanted.requests.push(row)}
 const expected=genshinContentAssets(workspace),materials=JSON.parse(expected.files.get('data/raw-materials.json')),characters=JSON.parse(expected.files.get('data/raw-characters.json'))
 for(const locale of ['zh','en','ja']){
  add({path:`/${locale}/genshin/items`,status:200});add({path:`/${locale}/genshin/characters`,status:200})
  for(const row of materials)add({path:`/${locale}/genshin/items/${row.id}`,status:200})
  for(const row of characters.filter((row:any)=>row.status!=='upcoming'))add({path:`/${locale}/genshin/characters/${row.id}`,status:200})
  for(const id of ['mualani','ororon'])add({path:`/${locale}/genshin/characters/${id}`,status:role==='candidate'?200:404})
  for(const id of ['sara','shinobu'])add({path:`/${locale}/genshin/characters/${id}`,status:404})
 }
 if(role==='recovery'){
  const old=new Set(materials.map((row:any)=>row.id)),next=JSON.parse(exported.sources.find((row:any)=>row.sourcePath==='packages/data/games/genshin/raw-materials.json').text)
  for(const row of next.filter((row:any)=>!old.has(row.id)))for(const locale of ['zh','en','ja'])add({path:`/${locale}/genshin/items/${row.id}`,status:404})
 }
 for(const file of unifiedStaticFiles(sealed.roles[role].artifact,'genshin').filter((row:any)=>row.path.startsWith('assets/_games/genshin/')))add({path:'/'+file.path.slice('assets/'.length).split('/').map(encodeURIComponent).join('/'),status:200,sha256:file.sha256})
 const origins:any={},names=['unused','genshin','nte','main'];let result:any
 async function start(position:number):Promise<void>{
  await withLocalWorker(path.join(workspace,'apps/game-genshin'),configs[names[position]],path.join(directory,'home'),path.join(directory,names[position]+'-worker.log'),async(origin:string)=>{
   origins[names[position]]=origin;if(position+1<names.length)return start(position+1)
   const binding=(name:string)=>({fetch:async(input:Request|string,init?:RequestInit)=>{
    const req=input instanceof Request?new Request(input,init):new Request(input,init),url=new URL(req.url),headers=new Headers(req.headers);headers.delete('host')
    const response=await fetch(origins[name]+url.pathname+url.search,{method:req.method,headers,redirect:'manual',signal:AbortSignal.timeout(30000)})
    const bytes=Buffer.from(await response.arrayBuffer()),outputHeaders=new Headers(response.headers)
    for(const key of ['content-encoding','content-length','transfer-encoding'])outputHeaders.delete(key)
    return new Response([204,205,304].includes(response.status)?null:bytes,{status:response.status,headers:outputHeaders})
   }})
   const env={...config(workspace,'router').vars,MAIN_SITE:binding('main'),NTE_SITE:binding('nte'),GENSHIN_SITE:binding('genshin'),AZUR_PROMILIA_SITE:binding('unused'),LVMENG_SITE:binding('unused')}
   const server=createServer(async(req,res)=>{
    try{const headers=new Headers();for(const[key,value]of Object.entries(req.headers))if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(', '):value)
     const response=await router.fetch(new Request('https://gachia.com'+req.url,{method:req.method,headers}),env,{waitUntil:(promise:Promise<any>)=>promise.catch(console.error),passThroughOnException(){}})
     res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()))
    }catch(error){console.error(error);res.writeHead(500);res.end(String(error))}
   });server.listen(0,'127.0.0.1');await once(server,'listening')
   try{result=await captureNteHTTP({origin:`http://127.0.0.1:${(server.address() as any).port}`,requests:wanted.requests,jsonValues:wanted.values,directory:path.join(directory,'responses')})}
   finally{server.close();await once(server,'close')}
  },{wranglerEntrypoint:sealed.tool.bin})
 }
 await start(0);recheckNteReferences(result.proof);results[role]=result.proof
 const refs=migrationPinned(result.proof),contract=materialConsumerContract('genshin',sourceRows)
 for(const page of contract.pages){const ref=refs.find((row:any)=>row.path===page.path);assert(ref);assertMaterialPageConsumer(page,ref.status,readFileSync(path.join(directory,'responses',ref.bodyFile),'utf8'))}
 for(const locale of ['zh','en','ja'] as const){const ref=refs.find((row:any)=>row.path===`/data-manifest/search-${locale}.json`);assertMaterialSearchConsumer(contract,locale,JSON.parse(readFileSync(path.join(directory,'responses',ref.bodyFile),'utf8')))}
 // Exact non-Genshin raw responses stay fixed across the owner substitution.
 for(const ref of refs.filter((row:any)=>row.path.startsWith('/data/')&&!row.path.startsWith('/data/genshin/'))){if(role==='candidate')other.set(ref.path,ref.sha256);else assert.equal(ref.sha256,other.get(ref.path),'Other game public data changed')}
 migrationSave(directory,'runtime.json',{kind:'published_router_module_binding_bridge_to_real_workerd_http',routerModuleSHA256:digest(routerBytes),actualWorkerResponses:true,routerWorkerdClaimed:false,role,requests:wanted.requests.length,materialPages:contract.pages.length,otherGameRawResponses:other.size,sourceIndex:exported.manifest.sourceIndex})
 console.log(JSON.stringify({role,requests:wanted.requests.length,materialPages:contract.pages.length,complete:true}))
}
migrationSave(root,'consumer-graph.json',results)
