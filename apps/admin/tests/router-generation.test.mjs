import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, access, symlink, mkdir, realpath, open } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateRouterConfig, renderRouterConfig } from '../../../scripts/generate-router-game-config.mjs';
import { readRouterInput, writeRouterOutput, routerInputLimit } from '../../../scripts/router-config-files.mjs';

test('Router generated check detects drift and missing output without writing', async (t) => {
  const dir = await realpath(await mkdtemp(join(tmpdir(), 'gachia-router-check-'))); t.after(() => rm(dir, { recursive: true, force: true }));
  const sourcePath = join(dir, 'source.ts'); const outputPath = join(dir, 'generated.ts');
  const source = `export const GAME_DEPLOYMENTS = {\n hi3: {\n deployment: 'main',\n worker: 'gachia',\n status: 'live',\n },\n nte: {\n deployment: 'game',\n worker: 'gachia-game-nte',\n assetPrefix: '/_games/nte',\n sitemapPath: '/sitemaps/nte/index.xml',\n status: 'live',\n },\n};`;
  await writeFile(sourcePath, source);
  let result = await generateRouterConfig({ check: true, sourcePath, outputPath });
  assert.equal(result.consistent, false); assert.equal(result.written, false);
  await assert.rejects(access(outputPath));
  await writeFile(outputPath, 'stale');
  result = await generateRouterConfig({ check: true, sourcePath, outputPath });
  assert.equal(result.consistent, false); assert.equal(await readFile(outputPath, 'utf8'), 'stale');
  const rendered = renderRouterConfig(source); assert.equal(rendered.count, 1); assert.ok(!rendered.content.includes('"id": "hi3"'));
  await writeFile(outputPath, rendered.content);
  result = await generateRouterConfig({ check: true, sourcePath, outputPath });
  assert.equal(result.consistent, true); assert.equal(result.written, false);
  assert.equal(await readFile(sourcePath, 'utf8'), source);
  assert.throws(() => renderRouterConfig(source.replace("worker: 'gachia-game-nte',", '')), /Incomplete/);
});

test('Router input budgets and unsafe paths fail without overwriting targets', async (t) => {
  const dir = await realpath(await mkdtemp(join(tmpdir(), 'gachia-router-files-'))); t.after(() => rm(dir, { recursive: true, force: true }));
  const sourcePath = join(dir, 'source.ts'); const outputPath = join(dir, 'generated.ts');
  await writeFile(sourcePath, 'export const GAME_DEPLOYMENTS = {};'); await writeFile(outputPath, 'preserve');
  await symlink(outputPath, join(dir, 'output-link')); await symlink(sourcePath, join(dir, 'source-link'));
  await mkdir(join(dir, 'directory')); await writeFile(join(dir, 'large'), Buffer.alloc(routerInputLimit + 1));
  for (const path of ['source-link', 'output-link', 'directory', 'large']) await assert.rejects(readRouterInput(join(dir, path)));
  for (const check of [true, false]) {
    await assert.rejects(generateRouterConfig({ sourcePath, outputPath: join(dir, 'output-link'), check }));
    await assert.rejects(generateRouterConfig({ sourcePath: join(dir, 'source-link'), outputPath, check }));
  }
  assert.equal(await readFile(outputPath, 'utf8'), 'preserve');
  const before = await readRouterInput(outputPath); await writeFile(outputPath, 'changed');
  await assert.rejects(writeRouterOutput(outputPath, 'new', before), /changed/);
  assert.equal(await readFile(outputPath, 'utf8'), 'changed');
  await writeRouterOutput(outputPath, 'short', await readRouterInput(outputPath));
  assert.equal(await readFile(outputPath, 'utf8'), 'short');
  const missing = join(dir, 'new.ts'); await writeRouterOutput(missing, 'created', null);
  assert.equal(await readFile(missing, 'utf8'), 'created');
});

test('Router writes tolerate short reads and reject oversized output before creating or changing files', async (t) => {
  const dir = await realpath(await mkdtemp(join(tmpdir(), 'gachia-router-short-read-')));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const output = join(dir, 'output.ts'); const missing = join(dir, 'missing.ts');
  const original = 'original'.repeat(20); await writeFile(output, original);
  const previous = await readRouterInput(output);
  for (const path of [output, missing]) {
    await assert.rejects(writeRouterOutput(path, 'x'.repeat(routerInputLimit + 1), path === output ? previous : null), /byte budget/);
  }
  assert.equal(await readFile(output, 'utf8'), original); await assert.rejects(access(missing));
  const handle = await open(output, 'r'); const prototype = Object.getPrototypeOf(handle); const read = prototype.read;
  await handle.close(); let partialReads = 0;
  t.mock.method(prototype, 'read', function (buffer, offset, length, position) {
    if (length > 13) partialReads++;
    return read.call(this, buffer, offset, Math.min(length, 13), position);
  });
  await writeRouterOutput(output, 'updated', previous);
  assert.ok(partialReads > 2); assert.equal(await readFile(output, 'utf8'), 'updated');
});

test('static Router source parsing supports formatting but rejects ambiguous and executable inputs', () => {
  const entry = `nte: { deployment: "game", worker: "gachia-game-nte", assetPrefix: "/_games/nte", sitemapPath: "/sitemaps/nte/index.xml", status: "live" }`;
  const source = `// hi3: { deployment: 'game', status: 'live' }\nexport const GAME_DEPLOYMENTS = ({ ${entry} }) as const satisfies Record<string, unknown>;`;
  assert.equal(renderRouterConfig(source).count, 1);
  const invalid = [
    '', `const OTHER = { ${entry} };`,
    `const GAME_DEPLOYMENTS = {}; const GAME_DEPLOYMENTS = {};`,
    `const GAME_DEPLOYMENTS = { ${entry}, ${entry} };`,
    `const GAME_DEPLOYMENTS = { ...other, ${entry} };`,
    `const GAME_DEPLOYMENTS = { ['nte']: {} };`,
    `const GAME_DEPLOYMENTS = { ${entry.replace('"game"', 'getDeployment()')} };`,
    `const GAME_DEPLOYMENTS = { ${entry.replace('status: "live"', 'status: "unknown"')} };`,
    `const GAME_DEPLOYMENTS = { ${entry.replace('/_games/nte', '/_games/other')} };`,
    `const GAME_DEPLOYMENTS = { ${entry.replace('status: "live"', 'status: "live", status: "preview"')} };`,
    `const GAME_DEPLOYMENTS = {`,
  ];
  for (const text of invalid) assert.throws(() => renderRouterConfig(text));
});

test('invalid source does not overwrite existing generated output even in generation mode', async (t) => {
  const dir = await realpath(await mkdtemp(join(tmpdir(), 'gachia-router-invalid-'))); t.after(() => rm(dir, { recursive: true, force: true }));
  const sourcePath = join(dir, 'source.ts'); const outputPath = join(dir, 'generated.ts');
  await writeFile(sourcePath, 'const OTHER = {};'); await writeFile(outputPath, 'preserve');
  for (const check of [true, false]) await assert.rejects(generateRouterConfig({ check, sourcePath, outputPath }));
  assert.equal(await readFile(outputPath, 'utf8'), 'preserve');
});
