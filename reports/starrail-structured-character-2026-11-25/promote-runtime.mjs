import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { ProxyAgent,setGlobalDispatcher } from '../../node_modules/.pnpm/node_modules/undici/index.js';
import { revalidateUnifiedUploadedModule,readUnifiedVersion } from '../../scripts/unified-version-identity.mjs';
import { normalizedBindings } from '../../scripts/desktop-cloud-transport.mjs';
import { isolatedEnvironment } from '../../scripts/desktop-publish.mjs';
const root=import.meta.dirname,hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),read=n=>JSON.parse(fs.readFileSync(path.join(root,n)));
const ci=read('ci.json'),prepared=read('runtime-prepared.json'),upload=read('runtime-upload.json');
assert.equal(ci.conclusion,'success');assert.equal(ci.headSha,upload.sourceCommit);
for(const name of ['local-acceptance.json','preview-acceptance.json'])assert.equal(read(name).status,'passed');
const before=read('runtime-before.json'),now=read('runtime-prepromotion.json');
assert(Date.now()-Date.parse(now.capturedAt)<120000,'Fresh production snapshot required');
const latest=row=>row.deployments.deployments.toSorted((a,b)=>a.created_on.localeCompare(b.created_on)).at(-1);
for(const service of Object.keys(before).filter(k=>k!=='capturedAt')){
 assert.deepEqual(latest(now[service]),latest(before[service]),'Production deployment changed: '+service);
 for(const name of ['routes','subdomain'])assert.deepEqual(now[service][name],before[service][name]);
 assert.deepEqual(normalizedBindings(now[service].settings.bindings),normalizedBindings(before[service].settings.bindings));
}
assert.equal(latest(now.gachia).versions[0].version_id,prepared.previousVersion);
const token=JSON.parse(fs.readFileSync(path.join(os.homedir(),'.wrangler/config/default.toml'),'utf8').match(/^oauth_token\s*=\s*("[^"\r\n]*")/m)[1]);
setGlobalDispatcher(new ProxyAgent('http://127.0.0.1:1087'));
await revalidateUnifiedUploadedModule({proof:upload.moduleProof,service:'gachia',versionId:upload.versionId,moduleSHA256:prepared.moduleSHA256,context:{role:'candidate',transportPin:hash(path.join(root,'runtime-prepared.json')),configPin:hash(path.join(root,'module/upload.json'))},readVersion:(service,versionId)=>readUnifiedVersion({service,versionId,token})});
const out=path.join(root,'.private/promote');assert(!fs.existsSync(out),'Reconcile rather than retry deployment');fs.mkdirSync(out,{mode:0o700});fs.mkdirSync(path.join(out,'home'),{mode:0o700});
const command=['versions','deploy',upload.versionId+'@100%','--config',path.join(root,'module/upload.json'),'--env','','--yes'];
fs.writeFileSync(path.join(root,'runtime-intent.json'),JSON.stringify({sourceCommit:upload.sourceCommit,previousVersion:prepared.previousVersion,versionId:upload.versionId,at:new Date().toISOString(),servicesChanged:['gachia'],contentWrites:0},null,2)+'\n',{flag:'wx'});
try{
 const output=execFileSync(process.execPath,[prepared.tool.bin,...command],{cwd:out,env:isolatedEnvironment(path.join(out,'home'),{CLOUDFLARE_API_TOKEN:token,CLOUDFLARE_ACCOUNT_ID:'e6472b6c6172a3ac1e1596ef100543ae',HTTPS_PROXY:'http://127.0.0.1:1087',HTTP_PROXY:'http://127.0.0.1:1087',WRANGLER_SEND_ERROR_REPORTS:'false'}),timeout:180000,maxBuffer:8*1024*1024,stdio:['ignore','pipe','pipe']});
 fs.writeFileSync(path.join(out,'deploy.log'),output,{flag:'wx',mode:0o600});
 fs.writeFileSync(path.join(root,'runtime-deploy-command.json'),JSON.stringify({returncode:0,automaticRetry:false,command},null,2)+'\n');
}catch(error){fs.writeFileSync(path.join(out,'deploy.log'),Buffer.concat([error.stdout??Buffer.alloc(0),error.stderr??Buffer.alloc(0)]),{flag:'wx',mode:0o600});throw Error('Deployment stopped; reconcile active traffic before doing anything else.');}
console.log(JSON.stringify({status:'promoted_pending_public_acceptance',versionId:upload.versionId,servicesChanged:['gachia']}));
