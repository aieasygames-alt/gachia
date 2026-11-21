// Rebind unchanged compiled inputs after the bounded HTTP orchestration correction.
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {existsSync,mkdirSync,readFileSync} from 'node:fs'
import path from 'node:path'
import {artifactFiles,isolatedEnvironment} from '../../scripts/desktop-publish.mjs'
import {digest} from '../../scripts/desktop-release-assets.mjs'
import {migrationPinned,migrationSave} from '../../scripts/genshin-migration-http.mjs'
import {freezeMainConsumerSource} from '../../services/content-cms/src/main-consumer-source.ts'
import {captureUnifiedExecutorSource} from '../../services/content-cms/src/unified-executor-source.ts'
import {verifyAppRuntime} from '../../scripts/require-app-runtime.mjs'
const root=import.meta.dirname,repo=path.resolve(root,'../..'),load=(name:string)=>JSON.parse(readFileSync(path.join(root,name),'utf8'))
const p=load('prepared.json'),executor=captureUnifiedExecutorSource(repo),changes=execFileSync('git',['diff','--name-only',p.commit,executor.commit],{cwd:repo,encoding:'utf8'}).trim().split('\n').filter(Boolean)
assert(changes.length>0&&changes.every(file=>file.startsWith('reports/public-next-security-2026-11-21-r146/')),'No Worker/application input changes allowed')
const sources=migrationPinned(load('baseline.json').active),workspaceProof=freezeMainConsumerSource(repo,executor.commit,sources,path.join(root,'frozen-final')),workspace=migrationPinned(workspaceProof).workspace
const home=path.join(root,'final-install-home');mkdirSync(home)
const pnpm='/opt/homebrew/lib/node_modules/pnpm/bin/pnpm.cjs',node='/opt/homebrew/opt/node@22/bin/node',store=load('frozen-install.json').store
execFileSync(node,[pnpm,'--config.manage-package-manager-versions=false','install','--offline','--frozen-lockfile','--ignore-scripts','--prod=false','--store-dir',store],{cwd:workspace,env:{...isolatedEnvironment(home),npm_config_manage_package_manager_versions:'false','npm_config_manage-package-manager-versions':'false'},stdio:['ignore','pipe','pipe']})
const built=[]
for(const owner of ['genshin','nte','azur-promilia','lvmeng','main']){
 const row=load(owner+'-built.json');assert.equal(row.commit,p.commit);assert.equal(digest(JSON.stringify(artifactFiles(row.artifact),null,2)+'\n'),row.treePin)
 const runtime=verifyAppRuntime(path.join(workspace,'apps',owner==='main'?'web':'game-'+owner));built.push({owner,artifact:row.artifact,treePin:row.treePin,runtime})
}
const reuse=migrationSave(root,'build-reuse.json',{compiledCommit:p.commit,executorCommit:executor.commit,changes,workerBuildInputsChanged:false,contentChanges:[],sources:load('baseline.json').active,built})
migrationSave(root,'prepared-final.json',{...p,commit:executor.commit,compiledCommit:p.commit,workspaceProof,workspace,buildReuse:reuse})
migrationSave(root,'sealed-modules-final.json',{...load('sealed-modules.json'),commit:executor.commit,compiledCommit:p.commit,buildReuse:reuse})
executor.verify();console.log(JSON.stringify({executorCommit:executor.commit,compiledCommit:p.commit,reusedOwners:built.length,workerBuildInputsChanged:false}))
