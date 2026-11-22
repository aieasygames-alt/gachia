import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { withLocalWorker } from '../../scripts/desktop-publish.mjs';
import { verifyBrowser, verifyHttp } from '../../scripts/runtime-rollout-smoke.mjs';
const root = import.meta.dirname;
const p = JSON.parse(readFileSync(path.join(root, 'prepared.json')));
const s = JSON.parse(readFileSync(path.join(root, 'sealed.json')));
const directory = path.join(root, 'browser'); mkdirSync(directory); mkdirSync(path.join(directory, 'home'));
const config = name => path.join(root, 'local/main/candidate', name + '.json');
const result = await withLocalWorker(path.join(p.workspace, 'apps/web'), config('main'), path.join(directory, 'home'), path.join(directory, 'worker.log'),
  async origin => ({ http: await verifyHttp('web', origin), browser: await verifyBrowser('web', origin, { directory }) }),
  { wranglerEntrypoint: s.tool.bin, additionalConfigs: ['genshin', 'nte'].map(config) });
assert.equal(result.browser.length, 18);
writeFileSync(path.join(root, 'browser-acceptance.json'), JSON.stringify({ status: 'passed', owner: 'main', ...result }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: 'passed', http: result.http.length, browser: result.browser.length }));
