// Node24 --env-file=<configured CMS .env> --import tsx; migrate a private probe first.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { getPayload, createLocalReq, initTransaction, commitTransaction, killTransaction } from '../../tools/payload-cms/node_modules/payload/dist/index.js';
import { parseStarRailUpdate } from '../../packages/data/cms/starrail-updates.ts';
const root=import.meta.dirname,mode=process.argv[2];assert(['probe','actual'].includes(mode));
process.env.NODE_ENV='production';
if(mode==='probe')process.env.DATABASE_URL='file:'+path.join(root,'.private/probe.db');
const cms=mode==='probe'?path.resolve(root,'../../tools/payload-cms'):'/Users/robert/Documents/gachia/tools/payload-cms';
if(mode==='actual') {
 const url=process.env.DATABASE_URL??'file:./.data/payload.db';assert(url.startsWith('file:'));
 const database=path.resolve(cms,url.slice(5));assert(fs.existsSync(database));
 process.env.DATABASE_URL='file:'+database;
}
const config=(await import(pathToFileURL(path.join(cms,'payload.config.ts')).href)).default;
const {migrations}=await import(pathToFileURL(path.join(cms,'migrations/index.ts')).href);
const payload=await getPayload({config});
try {
 // Execute only the reviewed additive migration in a Payload transaction. The
 // generic runner warns for every database with a historic dev schema-push row;
 // do not run a fresh/reset operation or remove that historic migration row.
 const migration=migrations.find(m=>m.name==='20261126_event_schedule');assert(migration);
 const history=await payload.find({collection:'payload-migrations',limit:100});
 assert.equal(history.hasNextPage,false);
 if(!history.docs.some(m=>m.name===migration.name)) {
  const req=await createLocalReq({},payload);
  try {
   await initTransaction(req);
   const db=(req.transactionID?payload.db.sessions[await req.transactionID]?.db:null)??payload.db.drizzle;
   await migration.up({db,payload,req});
   await payload.create({collection:'payload-migrations',data:{name:migration.name,batch:Math.max(0,...history.docs.map(m=>Number(m.batch)))+1},req});
   await commitTransaction(req);
  }catch(error){await killTransaction(req);throw error;}
 }
 const rows=await payload.find({collection:'game-updates',draft:false,overrideAccess:false,limit:301});
 const before=JSON.parse(fs.readFileSync(path.join(root,'cms-before.json'))).docs;
 const sorted=docs=>docs.map(parseStarRailUpdate).sort((a,b)=>a.slug.localeCompare(b.slug));
 assert.equal(rows.hasNextPage,false);assert.equal(rows.docs.length,71);assert.deepEqual(sorted(rows.docs),sorted(before));
 const latest=await payload.find({collection:'game-updates',draft:true,limit:301});
 assert.equal(latest.docs.length,71);
 for(const row of latest.docs){const prior=before.find(b=>b.id===row.id);assert(prior&&prior.updatedAt===row.updatedAt&&row._status==='published');}
 fs.writeFileSync(path.join(root,mode+'-migration.json'),JSON.stringify({status:'passed',method:'Payload additive migration',columns:['game_updates.event_schedule','_game_updates_v.version_event_schedule'],publicRecordsPreserved:71,latestRecordsAndTimestampsPreserved:true},null,2)+'\n',{flag:'wx'});
 console.log(mode+': migration passed, all 71 records preserved');
} finally {await payload.destroy();}
