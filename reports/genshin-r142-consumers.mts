import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { freezeMainConsumerSource, verifyMainConsumerSource } from '../services/content-cms/src/main-consumer-source.ts'
import { artifactFiles, isolatedEnvironment, withLocalWorker } from '../scripts/desktop-publish.mjs'
import { assertDiskBudget, BUILD_TEMP_BUDGET, diskSpace, DISK_RESERVE } from '../scripts/desktop-disk-preflight.mjs'
import { migrationPinned, migrationSave, migrationRequests } from '../scripts/genshin-migration-http.mjs'
import { digest } from '../scripts/desktop-release-assets.mjs'
import { genshinContentAssets } from '../scripts/genshin-content-assets.mjs'
import { prepareUnifiedAssetPair, verifyUnifiedAssetPair } from '../scripts/unified-release-assets.mjs'
import { sealMigrationOwner } from '../scripts/genshin-migration-prepare.mjs'
import { unifiedTransportTool } from '../scripts/unified-cloud-module.mjs'
import { nteLocalConfig } from '../services/content-cms/src/nte-release-bundle.ts'
import { materialConsumerContract, assertMaterialPageConsumer } from '../services/content-cms/src/material-consumer-contract.ts'
import { escapeCharacterText } from '../services/content-cms/src/unified-character-text.ts'
import { captureNteHTTP, recheckNteReferences } from '../scripts/nte-release-http.mjs'
const repo=path.resolve(import.meta.dirname,'..'), root=path.join(repo,'reports/genshin-collection-review-2026-11-21-r142')
const save=(file:string,value:any)=>migrationSave(root,file,value), load=(file:string)=>JSON.parse(readFileSync(path.join(root,file),'utf8'))
const phase=process.argv[2], buildNode='/opt/homebrew/opt/node@22/bin/node', pnpm='/Users/robert/Library/pnpm/.tools/pnpm/10.10.0/node_modules/pnpm/bin/pnpm.cjs'
const treePin=(dir:string)=>digest(JSON.stringify(artifactFiles(dir),null,2)+'\n')
const exported=load('installed-export-final.json').result
assert(exported.manifest.derivedSources?.length===1,'Use the final installed exporter with derived membership')
const sourceIndex=migrationPinned(exported.manifest.sourceIndex)
function cfg(workspace:string,owner:string) {
 const file=owner==='router'?'apps/router/wrangler.jsonc':owner==='main'?'apps/web/wrangler.jsonc':`apps/game-${owner}/wrangler.jsonc`
 const value=JSON.parse(readFileSync(path.join(workspace,file),'utf8').replace(/^\s*\/\/.*$/gm,''));delete value.env; value.find_additional_modules=false;return value
}
if(phase==='freeze') {
 const commit=execFileSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).trim()
 const candidate=freezeMainConsumerSource(repo,commit,exported.sources,path.join(root,'candidate-source'))
 const recovery=freezeMainConsumerSource(repo,commit,exported.recoverySources,path.join(root,'recovery-source'))
 save('consumer-prepared.json',{commit,candidate,recovery,exportKey:exported.manifest.exportKey,sourceIndex:exported.manifest.sourceIndex})
 console.log(JSON.stringify({phase,commit,exportKey:exported.manifest.exportKey}))
} else if(phase==='build'||phase==='build-02') {
 const p=load('consumer-prepared.json'), workspace=migrationPinned(p.candidate).workspace
 verifyMainConsumerSource(repo,p.candidate,exported.sources)
 const initial=phase==='build'?null:load('game-build-budget.json')
 if(initial)assert(initial.availableBytes>=initial.requiredBytes,'Original complete build must meet 14 GiB')
 const used=initial?Math.max(0,initial.availableBytes-diskSpace(root).availableBytes):0
 const remaining= Math.max(0,BUILD_TEMP_BUDGET-used)
 const budget=assertDiskBudget({path:root,operation:'R142 complete Genshin OpenNext build, same-budget continuation',estimatedBytes:remaining});save(phase==='build'?'game-build-budget.json':'game-build-budget-02.json',{...budget,initial,chargedTemporaryBytes:used,reserveMonitoredDuringBuild:true})
 const previous=path.join(repo,'reports/genshin-code-production-2026-11-20-r139/frozen/source')
 assert.equal(digest(readFileSync(path.join(previous,'pnpm-lock.yaml'))),digest(readFileSync(path.join(workspace,'pnpm-lock.yaml'))))
 const copied=[]
 for(const relative of ['node_modules',...['apps','packages'].flatMap(parent=>JSON.parse(execFileSync(process.execPath,['-e',`console.log(JSON.stringify(require('fs').readdirSync(${JSON.stringify(path.join(previous,parent))})))`],{encoding:'utf8'})).map((name:string)=>`${parent}/${name}/node_modules`))]) {
  const from=path.join(previous,relative), to=path.join(workspace,relative)
  if(existsSync(from)&&!existsSync(to)){execFileSync('/bin/cp',['-cR',from,to]);copied.push(relative)}
 }
 if(phase==='build')save('game-dependency-reuse.json',{source:previous,workspace,copied,lockSHA256:digest(readFileSync(path.join(workspace,'pnpm-lock.yaml'))),physicalClones:true})
 const home=path.join(root,phase==='build'?'game-build-home':'game-build-home-02');mkdirSync(home)
 const env={...isolatedEnvironment(home),PATH:path.dirname(buildNode)+path.delimiter+'/Users/robert/Library/pnpm/.tools/pnpm/10.10.0/bin'+path.delimiter+process.env.PATH,npm_config_manage_package_manager_versions:'false',NODE_OPTIONS:'--max-old-space-size=4096',GENSHIN_DEPLOYMENT_MODE:'production'}
 await new Promise<void>((resolve,reject)=>{
  const child=spawn(buildNode,[pnpm,'run','build:worker'],{cwd:path.join(workspace,'apps/game-genshin'),env,stdio:['ignore','pipe','pipe'],detached:true})
  for(const stream of [child.stdout,child.stderr])stream!.on('data',bytes=>appendFileSync(path.join(root,phase==='build'?'game-build.log':'game-build-02.log'),bytes))
  const monitor=setInterval(()=>{if(diskSpace(root).availableBytes<DISK_RESERVE){try{process.kill(-child.pid!,'SIGTERM')}catch{};clearInterval(monitor)}},1000)
  child.once('error',error=>{clearInterval(monitor);reject(error)});child.once('close',code=>{clearInterval(monitor);code===0?resolve():reject(Error(`Genshin build failed: ${code}`))})
 })
 verifyMainConsumerSource(repo,p.candidate,exported.sources)
 const artifact=path.join(workspace,'apps/game-genshin/.open-next');save('game-built.json',{commit:p.commit,artifact,treePin:treePin(artifact),exportKey:exported.manifest.exportKey})
 console.log(JSON.stringify({phase,complete:true,artifact}))
} else if(phase==='seal') {
 const p=load('consumer-prepared.json'),workspace=migrationPinned(p.candidate).workspace,built=load('game-built.json')
 assert.equal(treePin(built.artifact),built.treePin)
 const previous=sourceIndex.owners.genshin, directory=path.join(root,'sealed'), tool=unifiedTransportTool(workspace)
 mkdirSync(directory);mkdirSync(path.join(directory,'genshin'))
 for(const role of ['candidate','recovery'])mkdirSync(path.join(directory,'genshin',role))
 prepareUnifiedAssetPair({owner:'genshin',previous:previous.directory,candidate:built.artifact,forward:path.join(directory,'genshin/candidate/artifact'),recovery:path.join(directory,'genshin/recovery/artifact'),runtime:readFileSync(path.join(previous.directory,'worker.js'))})
 const roles:any={}
 for(const role of ['candidate','recovery']){
  const artifact=path.join(directory,'genshin',role,'artifact')
  roles[role]={...await sealMigrationOwner({workspace,directory,owner:'genshin',role,artifact,tool,runtimeConfig:cfg(workspace,'genshin')}),artifact,artifactPin:treePin(artifact)}
 }
 const compatibility=verifyUnifiedAssetPair({owner:'genshin',previous:previous.directory,candidate:built.artifact,forward:roles.candidate.artifact,recovery:roles.recovery.artifact,runtimeSHA256:previous.moduleSHA256})
 save('consumer-sealed.json',{commit:p.commit,tool,roles,compatibility});console.log(JSON.stringify({phase,complete:true}))
} else if(phase==='direct'||phase==='direct-resume') {
 const p=load('consumer-prepared.json'),workspace=migrationPinned(p.candidate).workspace,sealed=load('consumer-sealed.json'),results:any={}
 for(const role of ['candidate','recovery']){
  const dir=path.join(root,`${role}-direct`);if(!existsSync(dir)){mkdirSync(dir);mkdirSync(path.join(dir,'home'))}
  const source=role==='candidate'?workspace:migrationPinned(p.recovery).workspace,expected=genshinContentAssets(source), row=sealed.roles[role]
  const config=phase==='direct-resume'?{path:path.join(dir,'config.json')}:migrationSave(dir,'config.json',{...nteLocalConfig(cfg(workspace,'genshin'),'genshin',row.artifact,path.join(root,'sealed/genshin',role,'module/worker.js')),find_additional_modules:false})
  const requests=migrationRequests({owner:'genshin',role:'candidate',artifact:row.artifact,expected})
  const add=(wanted:any)=>{if(!requests.some((row:any)=>row.path===wanted.path))requests.push(wanted)}
  const materials=JSON.parse(expected.files.get('data/raw-materials.json')),characters=JSON.parse(expected.files.get('data/raw-characters.json'))
  for(const locale of ['zh','en','ja']){
   for(const row of materials)add({path:`/${locale}/genshin/items/${row.id}`,status:200})
   for(const row of characters.filter((row:any)=>row.status!=='upcoming'))add({path:`/${locale}/genshin/characters/${row.id}`,status:200})
   for(const id of ['mualani','ororon'])add({path:`/${locale}/genshin/characters/${id}`,status:role==='candidate'?200:404})
   for(const id of ['kujou-sara','kuki-shinobu'])add({path:`/${locale}/genshin/characters/${id}`,status:200,...(role==='candidate'?{contains:['id="character-materials"']}:{} )})
   for(const id of ['sara','shinobu'])add({path:`/${locale}/genshin/characters/${id}`,status:404})
  }
  const contract=materialConsumerContract('genshin',role==='candidate'?exported.sources:exported.recoverySources)
  results[role]=phase==='direct-resume'?{path:path.join(dir,'responses/references.json'),pin:digest(readFileSync(path.join(dir,'responses/references.json')))}:await withLocalWorker(path.join(workspace,'apps/game-genshin'),config.path,path.join(dir,'home'),path.join(dir,'worker.log'),async(origin:string)=>(await captureNteHTTP({origin,requests,directory:path.join(dir,'responses')})).proof,{wranglerEntrypoint:sealed.tool.bin})
  recheckNteReferences(results[role]);const refs=migrationPinned(results[role])
  for(const page of contract.pages){const ref=refs.find((row:any)=>row.path===page.path);assert(ref);assertMaterialPageConsumer(page,ref.status,readFileSync(path.join(dir,'responses',ref.bodyFile),'utf8'))}
  const recipes=JSON.parse(expected.files.get('data/raw-character-materials.json'))
  const checks=[]
  for(const recipe of recipes)for(const locale of ['zh','en','ja']){
   const ref=refs.find((row:any)=>row.path===`/${locale}/genshin/characters/${recipe.characterId}`)
   if(!ref||ref.status!==200){assert(role==='recovery'&&['sara','shinobu','mualani','ororon'].includes(recipe.characterId));continue}
   checks.push({path:ref.path,htmlFile:path.join(dir,'responses',ref.bodyFile),expected:[...recipe.ascensionMaterials,...recipe.talentMaterials].flatMap((stage:any)=>stage.materials.map((item:any)=>[item.id,item.quantity]))})
  }
  const checkFile=migrationSave(dir,phase==='direct-resume'?'character-checks-resume.json':'character-checks.json',checks)
  const recipeCheck=JSON.parse(execFileSync('python3',[path.join(repo,'reports/genshin-r142-character-check.py'),checkFile.path],{encoding:'utf8'}))
  if(role==='candidate')assert.equal(recipeCheck.references,5490*3)
  for(const id of ['mualani','ororon'])if(role==='candidate')for(const locale of ['zh','en','ja']){
   const ref=refs.find((row:any)=>row.path===`/${locale}/genshin/characters/${id}`),html=readFileSync(path.join(dir,'responses',ref.bodyFile),'utf8'),character=characters.find((row:any)=>row.id===id)
   for(const skill of Object.values(character.skills) as any[])if(skill)assert(html.includes(escapeCharacterText(locale==='zh'?skill.name:skill.nameEn)),`Missing skill ${id}/${skill.nameEn}`)
  }
  migrationSave(dir,phase==='direct-resume'?'source-derived-acceptance-final.json':'source-derived-acceptance.json',{materialPages:contract.pages.length,recipeCheck,skillsChecked:role==='candidate'?45:0,knownLegacyRelationPagesMissing:role==='recovery'?12:0})
  console.log(JSON.stringify({phase,role,requests:requests.length}))
 }
 save('consumer-direct.json',results)
} else throw Error('Expected freeze, build, seal or direct')
