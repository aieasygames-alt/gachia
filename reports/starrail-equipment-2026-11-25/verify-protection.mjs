import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { normalizedBindings } from '../../scripts/desktop-cloud-transport.mjs';
const root=import.meta.dirname, read=name=>JSON.parse(fs.readFileSync(path.join(root,name)));
const before=read('runtime-before.json'),after=read('runtime-after.json'),upload=read('runtime-upload.json');
const latest=s=>s.deployments.deployments.toSorted((a,b)=>a.created_on.localeCompare(b.created_on)).at(-1);
const services=Object.keys(before).filter(k=>k!=='capturedAt');
for(const service of services){
 if(service==='gachia') assert.deepEqual(latest(after[service]).versions,[{version_id:upload.versionId,percentage:100}]);
 else assert.deepEqual(latest(after[service]),latest(before[service]),service+' changed');
 for(const field of ['routes','subdomain'])assert.deepEqual(after[service][field],before[service][field],service+' '+field);
 assert.deepEqual(normalizedBindings(after[service].settings.bindings),normalizedBindings(before[service].settings.bindings),service+' bindings');
 const clean=({bindings,...rest})=>rest;assert.deepEqual(clean(after[service].settings),clean(before[service].settings),service+' settings');
}
const receipt={status:'passed',servicesChanged:['gachia'],previousVersion:latest(before.gachia).versions[0].version_id,versionId:upload.versionId,otherSixDeploymentsUnchanged:true,allSevenRoutesSubdomainsBindingsSettingsUnchanged:true,method:'independent Cloudflare API before/after snapshots'};
fs.writeFileSync(path.join(root,'runtime-protection.json'),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(receipt));
