import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { DatabaseSync } from 'node:sqlite'
import { projectRoot } from '../src/local-environment'

const require = createRequire(import.meta.url)
const adapterRequire = createRequire(require.resolve('@payloadcms/db-sqlite'))
const kitRoot = path.dirname(adapterRequire.resolve('drizzle-kit'))
const kitRequire = createRequire(path.join(kitRoot, 'package.json'))

test('pinned SQLite toolchain has no obsolete loader, and generates executable SQL twice', { timeout: 60000 }, () => {
  assert.equal(JSON.parse(readFileSync(path.join(kitRoot, 'package.json'), 'utf8')).version, '0.31.7')
  const lock = readFileSync(path.join(projectRoot, 'pnpm-lock.yaml'), 'utf8')
  assert.doesNotMatch(lock, /^  ['"]?@esbuild-kit\/(?:esm-loader|core-utils)@/m)
  for (const file of readdirSync(kitRoot).filter(name => /\.(?:cjs|mjs|js)$/.test(name))) {
    assert.ok(!readFileSync(path.join(kitRoot, file), 'utf8').includes('@esbuild-kit/esm-loader'), file)
  }
  const directory = mkdtempSync(path.join(tmpdir(), 'cms-kit-'))
  const db = new DatabaseSync(':memory:')
  try {
    writeFileSync(path.join(directory, 'schema.ts'), `import { sqliteTable, text, integer } from ${JSON.stringify(kitRequire.resolve('drizzle-orm/sqlite-core'))};\nexport const source = sqliteTable('sources', {id: integer().primaryKey(), key: text().notNull().unique(), raw: text().notNull()});\n`)
    writeFileSync(path.join(directory, 'drizzle.config.ts'), `export default { dialect: 'sqlite', schema: './schema.ts', out: './migrations' };\n`)
    writeFileSync(path.join(directory, 'block.cjs'), `const M=require('node:module'),r=M._resolveFilename;M._resolveFilename=function(id,...args){if(id.startsWith('@esbuild-kit/'))throw Error('Obsolete loader requested');return r.call(this,id,...args)};`)
    const generate = () => {
      const result = spawnSync(process.execPath, ['--require', path.join(directory, 'block.cjs'), path.join(kitRoot, 'bin.cjs'), 'generate', '--config', 'drizzle.config.ts'], { cwd: directory, encoding: 'utf8', timeout: 25000 })
      assert.equal(result.status, 0, result.stderr || result.error?.message)
      return result.stdout
    }
    generate()
    const files = readdirSync(path.join(directory, 'migrations')).filter(file => file.endsWith('.sql'))
    assert.equal(files.length, 1)
    const sql = readFileSync(path.join(directory, 'migrations', files[0]), 'utf8')
    db.exec(sql)
    db.prepare('INSERT INTO sources (key, raw) VALUES (?, ?)').run('one', '{}')
    assert.throws(() => db.prepare('INSERT INTO sources (key, raw) VALUES (?, ?)').run('one', '{}'))
    assert.match(generate(), /No schema changes/i)
    assert.equal(readFileSync(path.join(directory, 'migrations', files[0]), 'utf8'), sql)
  } finally {
    db.close()
    rmSync(directory, { recursive: true, force: true })
  }
})
