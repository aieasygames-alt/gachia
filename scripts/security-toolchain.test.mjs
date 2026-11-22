import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';

const web = createRequire(resolve(import.meta.dirname, '../apps/web/package.json'));
const cloudflarePackage = fs.realpathSync(resolve(import.meta.dirname, '../apps/web/node_modules/@opennextjs/cloudflare/package.json'));
const cloudflare = createRequire(cloudflarePackage);
const aws = createRequire(fs.realpathSync(join(dirname(cloudflarePackage), '../aws/package.json')));
const minifier = createRequire(aws.resolve('@node-minify/core'));
const express = createRequire(aws.resolve('express'));
const glob = cloudflare('glob');

test('OpenNext tracing and node-minify expand the same bounded files after the glob upgrade', async () => {
  const directory = fs.mkdtempSync(join(tmpdir(), 'gachia-security-glob-'));
  try {
    for (const file of ['server/app/a.js.nft.json', 'server/chunks/b.js.nft.json', 'server/app/skip.js', '.hidden/x.js.nft.json']) {
      fs.mkdirSync(dirname(join(directory, file)), { recursive: true });
      fs.writeFileSync(join(directory, file), file);
    }
    const expected = ['server/app/a.js.nft.json', 'server/chunks/b.js.nft.json'];
    assert.deepEqual(glob.globSync('**/*.nft.json', { cwd: directory, nodir: true }).sort(), expected);
    assert.deepEqual((await glob.glob('**/*.nft.json', { cwd: directory, nodir: true })).sort(), expected);
    assert.deepEqual(minifier('glob').globSync([join(directory, 'server/**/*.nft.json')]).sort(), expected.map(file => join(directory, file)));
    const content = await aws('@node-minify/core')({
      input: join(directory, 'server/**/*.nft.json'), output: join(directory, 'combined.txt'),
      compressor: ({ content, callback }) => callback(null, content),
    });
    for (const file of expected) assert(content.includes(file));
    assert(!content.includes('skip.js'));
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('aborted glob promise and stream stop recursive filesystem reads', async () => {
  const directory = fs.mkdtempSync(join(tmpdir(), 'gachia-security-abort-'));
  try {
    for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
      const target = join(directory, String(i), String(j));
      fs.mkdirSync(target, { recursive: true }); fs.writeFileSync(join(target, 'file.txt'), 'probe');
    }
    for (const mode of ['promise', 'stream']) {
      const controller = new AbortController(), reason = new Error('bounded abort probe');
      let reads = 0;
      const probeFS = { ...fs, readdir: (...args) => {
        reads++;
        if (reads === 1) controller.abort(reason);
        return fs.readdir(...args);
      } };
      const options = { cwd: directory, fs: probeFS, signal: controller.signal };
      const walk = mode === 'promise' ? glob.glob('**/*', options) : new Promise((yes, no) => {
        glob.globStream('**/*', options).on('error', no).on('end', yes).resume();
      });
      await assert.rejects(walk, /bounded abort probe/);
      const atRejection = reads;
      await delay(50);
      assert.equal(reads, atRejection, `${mode}: traversal continued after rejection`);
      assert.equal(reads, 1, `${mode}: abort must prevent descendant reads`);
    }
  } finally { fs.rmSync(directory, { recursive: true, force: true }); }
});

test('Express query serializer handles hostile comma-array elements and ordinary round trips', () => {
  const qs = express('qs');
  for (const value of [
    JSON.parse('{"a":[{"toString":"x"}]}'),
    qs.parse('a[0][toString]=x', { allowPrototypes: true }),
    qs.parse('a[][b]=c', { plainObjects: true }),
    { a: [null, undefined, 'normal'] },
  ]) for (const encodeValuesOnly of [false, true]) {
    assert.doesNotThrow(() => qs.stringify(value, { arrayFormat: 'comma', encodeValuesOnly }));
  }
  assert.equal(qs.stringify({ a: ['x', 'y'] }, { arrayFormat: 'comma' }), 'a=x%2Cy');
  assert.deepEqual(qs.parse(qs.stringify({ a: ['x', 'y'], nested: { value: 'ok' } })), { a: ['x', 'y'], nested: { value: 'ok' } });
});

test('TypeScript ESLint keeps glob matching and parses typed source with the upgraded minimatch', async () => {
  const config = createRequire(web.resolve('eslint-config-next'));
  const parser = config('@typescript-eslint/parser');
  const estree = createRequire(config.resolve('@typescript-eslint/parser'));
  const matcher = createRequire(estree.resolve('@typescript-eslint/typescript-estree'))('minimatch');
  for (const [file, pattern, expected] of [
    ['src/component.tsx', 'src/*.{ts,tsx}', true], ['src/.hidden.ts', 'src/*.ts', true],
    ['src/nested/component.tsx', 'src/*.tsx', false], ['src/api/route.ts', 'src/**/route.ts', true],
  ]) assert.equal(matcher.minimatch(file, pattern, { dot: true }), expected);
  const { ESLint } = web('eslint');
  const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: [{
    files: ['**/*.ts'], languageOptions: { parser }, rules: { 'no-unused-vars': 'error' },
  }] });
  const [valid] = await eslint.lintText('const value: number = 1; console.log(value);', { filePath: 'security-probe.ts' });
  assert.equal(valid.errorCount, 0, JSON.stringify(valid.messages));
  const [unused] = await eslint.lintText('const unused: number = 1;', { filePath: 'security-probe.ts' });
  assert.equal(unused.errorCount, 1); assert.equal(unused.messages[0].ruleId, 'no-unused-vars');
});
