import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'
import path from 'node:path'
import test from 'node:test'
import { writeGenshinLocalDependencyModules } from '../src/genshin-independent-bundle'
import { withLocalWorker } from '../../../scripts/desktop-publish.mjs'

test('independent loopback entry modules cannot watch mutable logs, config, persistence or response evidence', t => {
  const directory = mkdtempSync(path.join(tmpdir(), 'genshin-loopback-modules-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const code = Buffer.from('export default {fetch(){return new Response("router")}};\n')
  const modules = writeGenshinLocalDependencyModules(directory, code)
  for (const name of ['home', '.wrangler', 'responses']) { mkdirSync(path.join(directory, name)); writeFileSync(path.join(directory, name, 'mutable.log'), 'changed') }
  writeFileSync(path.join(directory, 'worker.log'), 'reload output'); writeFileSync(path.join(directory, 'router.json'), '{}')
  for (const [role, file] of Object.entries(modules)) {
    assert.equal(path.dirname(file), path.join(directory, role + '-module'))
    assert.deepEqual(readdirSync(path.dirname(file)), ['worker.js'])
  }
  assert.deepEqual(readFileSync(modules.router), code)
  assert.match(readFileSync(modules.unused, 'utf8'), /status:503/)
  assert.throws(() => writeGenshinLocalDependencyModules(directory, code), /EEXIST/)
})

test('real Wrangler reaches readiness with isolated dependencies while evidence logs are being written', async t => {
  const directory = mkdtempSync(path.join(tmpdir(), 'genshin-loopback-real-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const modules = writeGenshinLocalDependencyModules(directory, Buffer.from('export default {fetch(request,env){return env.MAIN.fetch(request)}};\n'))
  const main = path.join(directory, 'main-module'); mkdirSync(main)
  writeFileSync(path.join(main, 'worker.js'), 'export default {fetch(){return new Response("isolated-main")}};\n')
  const configs = [
    { name: 'isolated-router', main: modules.router, services: [{ binding: 'MAIN', service: 'isolated-main' }] },
    { name: 'isolated-main', main: path.join(main, 'worker.js') },
    { name: 'isolated-unused', main: modules.unused },
  ].map((config, index) => {
    const file = path.join(directory, index + '.json')
    writeFileSync(file, JSON.stringify({ compatibility_date: '2026-07-08', no_bundle: true, ...config })); return file
  })
  const home = path.join(directory, 'home'); mkdirSync(home)
  const repo = path.resolve(import.meta.dirname, '../../..'), require = createRequire(path.join(repo, 'apps/web/package.json'))
  const wranglerEntrypoint = path.join(path.dirname(require.resolve('wrangler/package.json')), 'wrangler-dist/cli.js')
  await withLocalWorker(path.join(repo, 'apps/web'), configs[0], home, path.join(directory, 'worker.log'), async (origin: string) => {
    const response = await fetch(origin, { signal: AbortSignal.timeout(10000) })
    assert.equal(response.status, 200); assert.equal(await response.text(), 'isolated-main')
  }, { wranglerEntrypoint, additionalConfigs: configs.slice(1) })
})
