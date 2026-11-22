"""R147 bounded, read-only probes. Every application import resolves inside the release."""
import fcntl
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys

REPO = Path(__file__).resolve().parent.parent
REPORT = REPO / 'reports/cms-source-reader-2026-11-22-r147'
ROOT = Path.home() / 'Library/Application Support/GachiaCMS'
NODE = '/opt/homebrew/Cellar/node/25.9.0_3/bin/node'
SOURCE = {'path': str(REPO / 'reports/public-next-security-2026-11-21-r146/published-sources/source-index.json'),
          'pin': '93c6bf6fd6095269414856c575e8012409a10f29a774f06ad8eb1c6ac3af06d3'}

action = sys.argv[1]
assert action in ['prepared-reader', 'installed-reader', 'cloud-before', 'cloud-after', 'http']
prepared = json.loads((REPORT / 'application-prepared.json').read_text())
cfg = json.loads((ROOT / 'settings.json').read_text())
app = Path(prepared['app'])
assert app.is_dir() and app.resolve() == app
if action != 'prepared-reader':
    assert cfg['app'] == (prepared['previousApp'] if action == 'cloud-before' else str(app))
output = REPORT / (action + '.json')
assert not output.exists()
environment = dict(os.environ, NODE_ENV='production', NEXT_TELEMETRY_DISABLED='1',
                   NODE_USE_ENV_PROXY='1', HTTPS_PROXY='http://127.0.0.1:1087',
                   HTTP_PROXY='http://127.0.0.1:1087', NO_PROXY='127.0.0.1,localhost')
environment.update(R147_REPO=str(REPO), R147_REPORT=str(REPORT), R147_ROOT=str(ROOT),
                   R147_ACTION=action, R147_APP=str(app), R147_OUTPUT=str(output),
                   R147_SOURCE=json.dumps(SOURCE))
code = r'''
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { R147_REPO: repo, R147_REPORT: report, R147_ROOT: root,
 R147_ACTION: action, R147_APP: app, R147_OUTPUT: output } = process.env;
const load = f => JSON.parse(readFileSync(f, 'utf8'));
const sourceIndex = JSON.parse(process.env.R147_SOURCE), prepared = load(path.join(report, 'application-prepared.json'));
const installedImport = relative => import(pathToFileURL(path.resolve(app, relative)).href);
const sha = f => createHash('sha256').update(readFileSync(f)).digest('hex');
const manifest = load(prepared.application.path);
assert.equal(sha(prepared.application.path), prepared.application.pin);
for (const [relative, pin] of Object.entries(manifest.files)) assert.equal(sha(path.join(app, relative)), pin, relative);
for (const [relative, pin] of Object.entries(manifest.releaseFiles)) assert.equal(sha(path.resolve(app, '../..', relative)), pin, relative);
let result;
if (action.endsWith('reader')) {
 if (action === 'installed-reader') {
  const { verifyUnifiedInstalledApplication } = await installedImport('src/unified-installed-application.ts');
  verifyUnifiedInstalledApplication(root, repo, prepared.sourceCommit, prepared.application);
 }
 const { withSourceHistoryRepository } = await installedImport('src/source-history-repository.ts');
 const { readNteSourceIndex } = await installedImport('src/nte-release-history.ts');
 console.log(JSON.stringify({ phase: 'opening_installed_reader', action, app, at: new Date().toISOString() }));
 const opened = await withSourceHistoryRepository(repo, () => readNteSourceIndex(sourceIndex));
 assert.equal(opened.value.kind, 'nte_public_runtime_source_index_v1');
 assert.equal(opened.allOwnersCurrent, true); assert.equal(opened.sources.length, 115);
 assert.deepEqual(Object.keys(opened.owners).sort(), ['azur-promilia','genshin','lvmeng','main','nte']);
 const r146 = load(path.join(repo,'reports/public-next-security-2026-11-21-r146/completion.json'));
 assert.deepEqual(opened.baseline, r146.after);
 const hashes = opened.sources.map(({sourcePath, sha256})=>({sourcePath, sha256}));
 if (action === 'installed-reader') assert.deepEqual(hashes, load(path.join(report,'prepared-reader.json')).sourceHashes);
 result = { sourceIndex, sourceCount: opened.sources.length, allOwnersCurrent: true,
  owners: Object.fromEntries(Object.entries(opened.owners).map(([owner,row])=>[owner,{service:row.service,versionId:row.versionId}])),
  sourceHashes: hashes, installedReader: path.join(app,'src/nte-release-history.ts'),
  installedReaderSHA256: sha(path.join(app,'src/nte-release-history.ts')),
  runtimeHistory: path.resolve(app,'../../scripts/public-runtime-history.mjs'),
  runtimeHistorySHA256: sha(path.resolve(app,'../../scripts/public-runtime-history.mjs')),
  repositoryUse: 'Historical Git objects and pinned absolute evidence only; executable modules imported from sealed release',
  applicationVerified: true, currentApplicationVerified: action === 'installed-reader', cmsWrites: 0, cloudWrites: 0 };
} else if (action.startsWith('cloud-')) {
 const { desktopCloudSnapshot, assertTopology } = await installedImport('../../scripts/desktop-cloud-release.mjs');
 const { unifiedProductionRead } = await installedImport('../../scripts/unified-production-transport.mjs');
 const text = readFileSync(path.join(homedir(),'.wrangler/config/default.toml'),'utf8');
 const field = key => JSON.parse(text.match(new RegExp('^'+key+'\\s*=\\s*("[^"\\r\\n]*")\\s*$','m'))[1]);
 assert(Date.parse(field('expiration_time')) > Date.now());
 const token = field('oauth_token');
 const snapshot = await desktopCloudSnapshot(token, unifiedProductionRead);
 assertTopology(load(path.join(repo,'reports/public-next-security-2026-11-21-r146/completion.json')).after, snapshot);
 const staging = {};
 for (const service of ['gachia-game-genshin-staging','gachia-game-azur-promilia-staging','gachia-router-staging']) {
  staging[service]={};
  for (const endpoint of ['deployments','settings']) {
   const response = await unifiedProductionRead(`https://api.cloudflare.com/client/v4/accounts/e6472b6c6172a3ac1e1596ef100543ae/workers/scripts/${service}/${endpoint}`,
    {method:'GET',headers:{authorization:'Bearer '+token},signal:AbortSignal.timeout(30000)});
   const body = await response.json(); assert(response.ok && body.success);
   if(endpoint==='settings') body.result.bindings=body.result.bindings.map(row=>row.type==='secret_text'?{name:row.name,type:row.type}:row);
   staging[service][endpoint]=body.result;
  }
 }
 assert.deepEqual(staging,load(path.join(repo,'reports/public-next-security-2026-11-21-r146/baseline.json')).staging);
 if(action==='cloud-after') {
  const before=load(path.join(report,'cloud-before.json'));
  assertTopology(before.snapshot,snapshot); assert.deepEqual(before.staging,staging);
 }
 result={snapshot,staging,productionServices:6,stagingServices:4,deploymentsAndSettingsPreserved:true,cloudWrites:0};
} else {
 const origin='http://127.0.0.1:3100', checks=[];
 for(const url of ['/health','/admin/login','/api/content-records','/api/media','/api/genshin-review-decisions']) {
  const response=await fetch(origin+url,{redirect:'manual',signal:AbortSignal.timeout(30000)});
  const body=await response.text(), expected=url.startsWith('/api/')?403:200;
  assert.equal(response.status,expected,url);assert.equal(response.headers.get('x-powered-by'),null);
  assert.equal(response.headers.get('x-robots-tag'),'noindex, nofollow');
  checks.push({url,status:response.status});
  if(url==='/admin/login') {
   const assets=[...new Set([...body.matchAll(/(?:src|href)="([^" ]*\/_next\/static\/[^" ]+)"/g)].map(m=>m[1].replaceAll('&amp;','&')))];
   assert(assets.length>0);
   for(const asset of assets){const r=await fetch(new URL(asset,origin));assert.equal(r.status,200,asset);await r.arrayBuffer();checks.push({url:asset,status:r.status});}
  }
 }
 result={healthy:true,checks,cmsWrites:0};
}
writeFileSync(output,JSON.stringify({action,application:prepared.application,sourceCommit:prepared.sourceCommit,
 observedAt:new Date().toISOString(),...result},null,2)+'\n',{flag:'wx',mode:0o600});
console.log(JSON.stringify({action,passed:true,sourceCount:result.sourceCount,allOwnersCurrent:result.allOwnersCurrent,checks:result.checks?.length}));
'''
loader = (app / 'node_modules/tsx/dist/loader.mjs').resolve()
assert loader.is_file()
with (ROOT / 'maintenance.lock').open('a') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    with (REPORT / (action + '.log')).open('x') as log:
        subprocess.run([NODE, '--import', str(loader), '--input-type=module', '-e', code],
                       cwd=app, env=environment, check=True, stdout=log, stderr=log, timeout=1200)
print(json.dumps({'action': action, 'passed': True, 'receipt': str(output)}))
