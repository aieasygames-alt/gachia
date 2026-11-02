import { randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { snapshot, importSnapshots } from '../src/legacy-intake'
import { mapBatch } from '../src/record-mapping'
import { importRecordBatch } from '../src/record-store'
import { stageReview } from '../src/review-store'
import { materialCells } from '../src/material-draft'
const material = process.argv.slice(2).includes('--material')
if (process.argv.slice(2).some(arg => arg !== '--material')) throw new Error('Only --material is supported')
process.env.CMS_LOCAL_ONLY='1'
// Never reuse a migration or editorial database for browser acceptance.
await new Promise<void>((resolve, reject) => {
 const probe = createServer()
 probe.once('error', reject)
 probe.listen(3100, '127.0.0.1', () => probe.close(error => error ? reject(error) : resolve()))
})
process.env.CMS_LOCAL_NAMESPACE=`browser-merge-${randomUUID()}`
process.env.PAYLOAD_SECRET=randomUUID()+randomUUID()
const {getPayload}=await import('payload'); const {default:config}=await import('../src/payload.config'); const p=await getPayload({config})
const email='merge-reviewer@example.invalid',password=randomUUID()+'Aa1!'
try {
 const user=await p.create({collection:'users',data:{email,password,role:'reviewer'}})
 const policy={digest:'merge-ui-fixture',routes:{games:{}}}
 const stage=async(title:string,body:string,base?:string)=>{
  const source=snapshot('fixture',`packages/data/games/fixture/raw-${material ? 'materials' : 'guides'}.json`,'raw-json',JSON.stringify([material ? { id:'merge-demo',name:title,type:'resource',rarity:3,notes:body,uses:[],nameEn:'',nameJa:null } : {id:'merge-demo',title,content:body}]))
  await importSnapshots(p,[source]);const batch=mapBatch([source],policy);await importRecordBatch(p,batch,policy);const run=await stageReview(p,batch.batchKey,base,material ? 'review-v2-material' : 'review-v1')
  const item=(await p.find({collection:'review-items',where:{runKey:{equals:run.runKey}}})).docs[0];return {batch,item}
 }
 const base=await stage('Original source title','Original source body')
 const intake=await p.create({collection:'review-decisions',user,overrideAccess:false,data:{reviewItem:base.item.id,action:'accept-draft',note:'Synthetic UI test; remain held.'}})
 const draftID=typeof intake.draft==='object'?intake.draft!.id:intake.draft!
 await p.update({collection:'editorial-drafts',id:draftID,user,overrideAccess:false,data:{editorNote:'Preserve this editorial note.',...(material ? { materialFields:materialCells({id:'merge-demo',name:'Human-edited title',type:'resource',rarity:3,notes:'Original source body',uses:[],nameEn:'',nameJa:null}) } : { translations:[{locale:'zh',title:'Human-edited title',body:'Original source body',summary:'Human summary'}] })}})
 const incoming=await stage('Incoming source title','Updated source body',base.batch.batchKey)
 const proposal=await p.create({collection:'draft-merge-proposals',user,overrideAccess:false,data:{draft:draftID,reviewItem:incoming.item.id}})
 writeFileSync(`.local/${process.env.CMS_LOCAL_NAMESPACE}/browser-session.json`,JSON.stringify({namespace:process.env.CMS_LOCAL_NAMESPACE,material,email,password,draftID,proposalID:proposal.id}),{mode:0o600,flag:'wx'})
} finally {await p.destroy()}
console.log(`Disposable merge UI fixture ready. Credentials: .local/${process.env.CMS_LOCAL_NAMESPACE}/browser-session.json`)
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3100'],{stdio:'inherit',env:{...process.env,NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1'}})
process.on('SIGTERM',()=>child.kill('SIGTERM'));process.on('SIGINT',()=>child.kill('SIGTERM'))
const exitCode = await new Promise<number>((resolve, reject) => { child.once('error', reject); child.once('exit', code => resolve(code ?? 1)) })
process.exitCode = exitCode
