import assert from 'node:assert/strict';
import { readFileSync,mkdirSync,writeFileSync,existsSync } from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { withLocalWorker } from '../../scripts/desktop-publish.mjs';
import { verifyBrowser,verifyHttp } from './browser-runtime-current.mjs';
const root=import.meta.dirname,p=JSON.parse(readFileSync(path.join(root,'prepared.json'))),s=JSON.parse(readFileSync(path.join(root,existsSync(path.join(root,'sealed.json'))?'sealed.json':'sealed-modules.json')));
const results=[];
for(const owner of ['main','genshin','lvmeng','nte','azur-promilia']){
 if(owner==='main'&&existsSync(path.join(root,'browser/main/result.json'))){const value=JSON.parse(readFileSync(path.join(root,'browser/main/result.json')));assert.equal(value.browser.length,18);assert(value.browser.every(row=>row.runtimeErrors===0&&row.failedAssets===0));results.push({owner,...value});console.log(JSON.stringify({browserReopened:owner}));continue;}
 const directory=path.join(root,'browser',owner);mkdirSync(directory,{recursive:true});mkdirSync(path.join(directory,'home'));
 const configs={};
 for(const name of ['main','genshin','nte','lvmeng','azur-promilia']){
  const local=JSON.parse(readFileSync(path.join(root,'local',owner,'candidate',name+'.json')));configs[name]=path.join(directory,name+'.json');writeFileSync(configs[name],JSON.stringify(local)+'\n',{flag:'wx'});
 }
 const app=owner==='main'?'web':'game-'+owner;
 const result=await withLocalWorker(path.join(p.workspace,'apps',app),configs[owner],path.join(directory,'home'),path.join(directory,'worker.log'),async origin=>{
  if(['main','genshin','lvmeng'].includes(owner))return{http:await verifyHttp(app,origin),browser:await verifyBrowser(app,origin,{directory})};
  const browser=await chromium.launch({headless:true}),checks=[];
  try{for(const width of [1440,390])for(const locale of ['zh','en','ja'])for(const enabled of [true,false]){
   const context=await browser.newContext({viewport:{width,height:900},javaScriptEnabled:enabled,serviceWorkers:'block'}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
   const id=owner==='nte'?'nanally':'abby',url=`/${locale}/${owner}/characters`,response=await page.goto(origin+url,{waitUntil:'networkidle'});assert.equal(response.status(),200);assert(await page.locator('h1').isVisible());
   const link=page.locator(`a[href="${url}/${id}"]`).first();assert(await link.count());
   if(enabled){await page.evaluate(()=>{window.__r146='preserved'});await link.hover();await link.click();await page.waitForURL(origin+url+'/'+id);assert.equal(await page.evaluate(()=>window.__r146),'preserved');assert(await page.locator('h1').isVisible());await page.goBack();await page.waitForURL(origin+url);}
   assert.deepEqual(errors,[]);checks.push({width,locale,javascript:enabled,clientNavigation:enabled,errors});await context.close();
  }}finally{await browser.close()};return{browser:checks};
 },{wranglerEntrypoint:s.tool.bin,additionalConfigs:owner==='main'?['genshin','nte'].map(name=>configs[name]):[]});
 results.push({owner,...result});writeFileSync(path.join(directory,'result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({browserAccepted:owner}));
}
writeFileSync(path.join(root,'browser-acceptance.json'),JSON.stringify({status:'passed',results},null,2)+'\n',{flag:'wx'});
