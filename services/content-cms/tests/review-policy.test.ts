import assert from 'node:assert/strict'
import test from 'node:test'
import { randomUUID } from 'node:crypto'
import { rm } from 'node:fs/promises'
import { localEnvironment } from '../src/local-environment'
import { snapshot, importSnapshots } from '../src/legacy-intake'
import { mapBatch } from '../src/record-mapping'
import { importRecordBatch } from '../src/record-store'
import { stageReview } from '../src/review-store'
test('cross-policy rejection blocks reverse acceptance', async () => {
process.env.CMS_LOCAL_ONLY='1';process.env.CMS_LOCAL_NAMESPACE=`audit-policy-${randomUUID()}`;process.env.PAYLOAD_SECRET=randomUUID()+randomUUID()
const local=localEnvironment()
const {getPayload}=await import('payload');const {default:config}=await import('../src/payload.config');const p=await getPayload({config})
try {
 const user=await p.create({collection:'users',data:{email:'audit@example.invalid',password:randomUUID()+'Aa1!',role:'reviewer'}})
 const source=snapshot('nte','packages/data/games/nte/raw-guides.json','raw-json',JSON.stringify([{id:'audit',title:'Synthetic guide'}]))
 const policy={digest:'audit-policy',routes:{games:{}}};const batch=mapBatch([source],policy)
 await importSnapshots(p,[source]);await importRecordBatch(p,batch,policy)
 const old=await stageReview(p,batch.batchKey);const next=await stageReview(p,batch.batchKey,undefined,'review-v2-material')
 const item=async(runKey:string)=>(await p.find({collection:'review-items',where:{runKey:{equals:runKey}}})).docs[0]
 const v1=await item(old.runKey),v2=await item(next.runKey)
 await p.create({collection:'review-decisions',user,overrideAccess:false,data:{reviewItem:v2.id,action:'reject',note:'Reject synthetic revision under v2.'}})
 await assert.rejects(p.create({collection:'review-decisions',user,overrideAccess:false,data:{reviewItem:v1.id,action:'accept-draft',note:'Attempt same revision through old policy.'}}), /rejected/)

 // A fresh revision is eligible, but its acceptance cannot later be contradicted via another policy.
 const changed=snapshot('nte',source.sourcePath,'raw-json',JSON.stringify([{id:'audit',title:'New revision'}]))
 await importSnapshots(p,[changed]);const nextBatch=mapBatch([changed],policy);await importRecordBatch(p,nextBatch,policy)
 const new1=await stageReview(p,nextBatch.batchKey),new2=await stageReview(p,nextBatch.batchKey,undefined,'review-v2-material')
 const n1=await item(new1.runKey),n2=await item(new2.runKey)
 await p.create({collection:'review-decisions',user,overrideAccess:false,data:{reviewItem:n1.id,action:'accept-draft',note:'Accept changed revision under original policy.'}})
 await assert.rejects(p.create({collection:'review-decisions',user,overrideAccess:false,data:{reviewItem:n2.id,action:'reject',note:'Cannot contradict accepted revision.'}}),/already accepted/)

 const raceSource=snapshot('nte',source.sourcePath,'raw-json',JSON.stringify([{id:'race',title:'Concurrent'}]))
 await importSnapshots(p,[raceSource]);const raceBatch=mapBatch([raceSource],policy);await importRecordBatch(p,raceBatch,policy)
 const r1=await item((await stageReview(p,raceBatch.batchKey)).runKey)
 const r2=await item((await stageReview(p,raceBatch.batchKey,undefined,'review-v2-material')).runKey)
 const outcomes=await Promise.allSettled([
   p.create({collection:'review-decisions',user,overrideAccess:false,data:{reviewItem:r1.id,action:'accept-draft',note:'Concurrent cross-policy acceptance.'}}),
   p.create({collection:'review-decisions',user,overrideAccess:false,data:{reviewItem:r2.id,action:'reject',note:'Concurrent cross-policy rejection.'}}),
 ])
 assert.equal(outcomes.filter(result=>result.status==='fulfilled').length,1)
}finally{await p.destroy();await rm(local.directory,{recursive:true,force:true})}

})
