import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';

const root = resolve(import.meta.dirname, '..');
const require = createRequire(join(root, 'packages/db/package.json'));
const kitRoot = dirname(require.resolve('drizzle-kit'));

test('pinned Drizzle Kit no longer needs the deprecated loader dependency', () => {
  assert.equal(JSON.parse(readFileSync(join(kitRoot, 'package.json'), 'utf8')).version, '0.31.11');
  // Old pnpm stores may still contain hoisted files; the reproducible graph must not.
  const lock = readFileSync(join(root, 'pnpm-lock.yaml'), 'utf8');
  assert(!/^  ['"]?@esbuild-kit\/(?:esm-loader|core-utils)@/m.test(lock));
  for (const file of readdirSync(kitRoot).filter(name => /\.(?:cjs|mjs|js)$/.test(name))) {
    assert(!readFileSync(join(kitRoot, file), 'utf8').includes('@esbuild-kit/esm-loader'), `${file} still refers to removed dependency`);
  }
});

test('Drizzle generates real schema SQL offline and a second generation is unchanged', { timeout: 60000 }, () => {
  const directory = mkdtempSync(join(tmpdir(), 'gachia-db-toolchain-'));
  const db = new DatabaseSync(':memory:');
  try {
    // No credentials or database URL: only generate into a disposable directory.
    const config = join(directory, 'drizzle.config.ts');
    writeFileSync(config, `export default ${JSON.stringify({
      dialect: 'sqlite', out: './migrations',
      schema: ['schema.ts', 'map-progress-schema.ts', 'rate-limit-schema.ts'].map(file => join(root, 'packages/db/src', file)),
    })};\n`);
    const blocker = join(directory, 'block-legacy-loader.cjs');
    writeFileSync(blocker, `const Module = require('node:module'); const original = Module._resolveFilename; Module._resolveFilename = function(id, ...args) { if (id.startsWith('@esbuild-kit/')) throw new Error('Removed legacy loader was requested'); return original.call(this, id, ...args); };`);
    const generate = () => {
      const result = spawnSync(process.execPath, ['--require', blocker, join(kitRoot, 'bin.cjs'), 'generate', '--config', config], {
        cwd: directory, timeout: 30000, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
      });
      assert.equal(result.status, 0, result.stderr || result.error?.message);
      return result.stdout + result.stderr;
    };
    generate();
    const migrations = () => readdirSync(join(directory, 'migrations')).filter(file => file.endsWith('.sql')).sort();
    const files = migrations();
    assert.equal(files.length, 1);
    const sql = readFileSync(join(directory, 'migrations', files[0]), 'utf8');
    db.exec(sql);
    const names = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row => row.name);
    for (const table of ['user', 'session', 'account', 'verification', 'user_favorites', 'user_characters', 'shared_builds', 'map_progress', 'rate_limits']) {
      assert(names.includes(table), `Missing generated table ${table}`);
    }
    assert.match(generate(), /No schema changes/i);
    assert.deepEqual(migrations(), files);
    assert.equal(readFileSync(join(directory, 'migrations', files[0]), 'utf8'), sql);
  } finally {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
