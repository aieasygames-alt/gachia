import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import http from 'node:http'
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { projectRoot } from '../src/local-environment'
import { unifiedLoopbackRequest, verifyUnifiedPreviewContract } from '../src/unified-preview'
import { digest } from '../../../scripts/desktop-release-assets.mjs'
import { unifiedHTMLParserPin } from '../../../scripts/unified-version-preview.mjs'

test('preview CLI has no implicit scope, credentials, upload or promote', () => {
  for (const args of [[], ['upload'], ['promote'], ['prepare', '--all'], ['verify', '--directory', '/not-opened'],
    ['verify', '--directory', '/not-opened', '--pin', 'a'.repeat(64), '--token', 'fixture'],
    ['verify', '--directory', '/not-opened', '--pin', 'a'.repeat(64), '--pin', 'b'.repeat(64)]]) {
    const result = spawnSync(process.execPath, ['--import', 'tsx', path.join(projectRoot, 'scripts/unified-preview.ts'), ...args],
      { cwd: projectRoot, env: { PATH: process.env.PATH, NODE_ENV: 'test' }, encoding: 'utf8', timeout: 15000, maxBuffer: 128 * 1024 })
    assert.equal(result.status, 1); assert.match(result.stderr, /Usage: unified-preview|Invalid preview arguments|Require --/)
    assert(!result.stderr.includes('ENOENT'))
  }
})

test('local probe uses the exact Host, path and locale without following redirects or forwarding spoofed headers', async () => {
  const exact = 'https://1234abcd-gachia-game-lvmeng.aieasygames.workers.dev'
  const server = http.createServer((req, res) => {
    assert.equal(req.headers.host, new URL(exact).host); assert.equal(req.url, '/zh/lvmeng'); assert.equal(req.headers['accept-language'], 'zh')
    assert.equal(req.headers['x-forwarded-host'], undefined); assert.equal(req.headers.cookie, undefined)
    res.writeHead(302, { location: 'https://evil.invalid', 'set-cookie': 'observed=1' }); res.end('redirect')
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const address = server.address() as { port: number }, request = unifiedLoopbackRequest(`http://127.0.0.1:${address.port}`, exact)
    const result = await request(exact + '/zh/lvmeng', { method: 'GET', headers: { cookie: 'not-forwarded', 'x-forwarded-host': 'evil.invalid' } })
    assert.equal(result.status, 302); assert.equal(result.headers.get('set-cookie'), 'observed=1')
    await assert.rejects(request('https://evil.invalid/zh/lvmeng', { method: 'GET' }))
    assert.throws(() => unifiedLoopbackRequest('https://gachia.com', exact))
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())) }
})

for (const field of ['productionReady', 'activationSupported', 'cloudWrites', 'credentials', 'cloudIdentityVerified', 'syntheticVersion', 'parserPin', 'status', 'state']) {
  test(`independent local verifier rejects tampered ${field} before opening upstream`, async () => {
    const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'cms-preview-state-')))
    try {
      const receipt: Record<string, unknown> = { schemaVersion: 1, kind: 'unified_local_exact_host_contract', status: 'all_local_preview_hosts_accepted',
        parserPin: unifiedHTMLParserPin(), syntheticVersion: true, productionReady: false, activationSupported: false, cloudWrites: false, credentials: false,
        cloudIdentityVerified: false, transportDirectory: '/must-not-open', transportPin: 'a'.repeat(64) }
      if (field === 'parserPin') receipt[field] = 'b'.repeat(64)
      else if (field === 'status') receipt[field] = 'running'
      else if (field !== 'state') receipt[field] = !receipt[field]
      const raw = JSON.stringify(receipt); writeFileSync(path.join(root, 'preview.json'), raw)
      writeFileSync(path.join(root, 'state.json'), JSON.stringify({ status: field === 'state' ? 'failed' : 'complete', cloudWrites: false }))
      await assert.rejects(verifyUnifiedPreviewContract(root, digest(raw)), error => { assert(!String(error).includes('ENOENT')); return true })
      await assert.rejects(verifyUnifiedPreviewContract(root, 'b'.repeat(64)), /changed/)
    } finally { rmSync(root, { recursive: true, force: true }) }
  })
}
