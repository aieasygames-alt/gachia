import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { artifactFiles, withLocalWorker } from './desktop-publish.mjs';
import { assertDiskBudget } from './desktop-disk-preflight.mjs';
import { parseWrangler } from './game-release.mjs';
import { genshinContentAssets } from './genshin-content-assets.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const json = value => `${JSON.stringify(value, null, 2)}\n`;

export async function smokeGenshinContent(output, root = ROOT) {
  root = realpathSync(root);
  const directory = resolve(output), app = join(root, 'apps/game-genshin'), artifact = join(app, '.open-next');
  assert(directory !== root && !root.startsWith(directory + '/'), 'Output cannot contain the source repository');
  assert.equal(realpathSync(dirname(directory)), dirname(directory), 'Linked smoke output parent');
  assertDiskBudget({ path: root, operation: 'local Genshin content HTTP smoke', estimatedBytes: 256 * 1024 * 1024 });
  const expected = genshinContentAssets(root), tree = artifactFiles(artifact);
  for (const [file, bytes] of expected.files) assert(readFileSync(join(artifact, 'assets', expected.contract.prefix, file)).equals(bytes), 'Built content differs from current source');
  mkdirSync(directory, { mode: 0o700 });
  const home = join(directory, 'home');
  mkdirSync(home, { mode: 0o700 });
  const config = parseWrangler(readFileSync(join(app, 'wrangler.jsonc'), 'utf8'));
  const localConfig = { name: 'genshin-content-local-smoke', main: join(artifact, 'worker.js'),
    compatibility_date: config.compatibility_date, compatibility_flags: config.compatibility_flags,
    assets: { directory: join(artifact, 'assets'), binding: 'ASSETS' }, vars: config.vars };
  const configPath = join(directory, 'local.json');
  writeFileSync(configPath, json(localConfig), { flag: 'wx', mode: 0o600 });
  const responses = [];
  const require = createRequire(join(app, 'package.json'));
  const wranglerEntrypoint = join(dirname(require.resolve('wrangler/package.json')), 'bin/wrangler.js');
  await withLocalWorker(app, configPath, home, join(directory, 'worker.log'), async origin => {
    for (const [file, bytes] of expected.files) {
      const path = `${expected.contract.prefix}/${file}`;
      const response = await fetch(origin + path, { redirect: 'error', signal: AbortSignal.timeout(30000) });
      const body = Buffer.from(await response.arrayBuffer());
      assert.equal(response.status, 200, `Content HTTP failed: ${path}`);
      assert.equal(response.headers.get('content-type')?.split(';')[0], 'application/json', 'Invalid content MIME');
      assert(!response.headers.has('set-cookie'), 'Public content sets a cookie');
      assert(body.equals(bytes), `Public data bytes changed: ${path}`);
      responses.push({ path, status: response.status, bytes: body.length, sha256: hash(body) });
    }
    const page = await fetch(origin + '/zh/genshin/characters/hu-tao', { redirect: 'error', signal: AbortSignal.timeout(30000) });
    assert.equal(page.status, 200, 'Existing character page regressed');
    assert((await page.text()).includes('胡桃'), 'Existing character content missing');
  }, { wranglerEntrypoint });
  assert.deepEqual(artifactFiles(artifact), tree, 'Local HTTP smoke changed the built artifact');
  const result = { schemaVersion: 1, kind: 'genshin_content_local_http', version: expected.manifest.version,
    artifactSHA256: hash(json(tree)), responses, existingCharacterPage: 'accepted', cloudWrites: false,
    productionReady: false, scope: 'Actual loopback OpenNext Worker data bytes; not production routing or CMS single-owner qualification' };
  writeFileSync(join(directory, 'verification.json'), json(result), { flag: 'wx', mode: 0o600 });
  return { directory, responses: responses.length, version: result.version, productionReady: false };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert(process.argv.length === 4 && process.argv[2] === '--output', 'Usage: node scripts/genshin-content-local-smoke.mjs --output <new-directory>');
  console.log(JSON.stringify(await smokeGenshinContent(process.argv[3])));
}
