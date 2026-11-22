import assert from 'node:assert/strict';
import { readFileSync,writeFileSync } from 'node:fs';
import path from 'node:path';
import { artifactFiles } from '../../scripts/desktop-publish.mjs';
import { digest } from '../../scripts/desktop-release-assets.mjs';
const root=import.meta.dirname,repo=path.resolve(root,'../..');
const previous=JSON.parse(readFileSync(path.join(repo,'reports/public-next-security-2026-11-21-r146/published-sources/source-index.json'))), rows=[];
const jsonFiles=directory=>artifactFiles(directory).filter(row=>row.type==='file'&&/^assets\/(?:data\/|data-client\/|data-manifest\/|_games\/[^/]+\/content\/|__content\/)/.test(row.path)&&row.path.endsWith('.json'));
for(const owner of ['genshin','nte','azur-promilia','lvmeng','main']){
 const current=JSON.parse(readFileSync(path.join(root,owner+'-built.json'))), old=previous.owners[owner].directory;
 const before=jsonFiles(old),after=jsonFiles(current.artifact);assert.deepEqual(after,before,owner+' public JSON bytes and inventory');
 for(const row of before)assert.deepEqual(JSON.parse(readFileSync(path.join(current.artifact,row.path))),JSON.parse(readFileSync(path.join(old,row.path))),owner+' public JSON '+row.path);
 rows.push({owner,count:before.length,preserved:true,oldTree:digest(JSON.stringify(before)),candidateTree:digest(JSON.stringify(after))});
}
writeFileSync(path.join(root,'json-preservation.json'),JSON.stringify({status:'passed',rows,contentChanges:0},null,2)+'\n',{flag:'wx'});console.log(rows);
