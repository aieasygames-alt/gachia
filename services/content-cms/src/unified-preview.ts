import assert from 'node:assert/strict'
import { mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { assertDiskBudget, GiB } from '../../../scripts/desktop-disk-preflight.mjs'
import { withRunLock } from '../../../scripts/desktop-publish.mjs'
import { digest } from '../../../scripts/desktop-release-assets.mjs'
import { exactUnifiedPreviewOrigin, recheckUnifiedPreview, unifiedHTMLParserPin, unifiedPreviewReferences,
  verifyUnifiedVersionPreview } from '../../../scripts/unified-version-preview.mjs'
import { serveUnifiedWorker } from './unified-publication'
import { verifyUnifiedTransport } from './unified-transport'

const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n'
const save = (file: string, value: unknown) => { const raw = json(value); writeFileSync(file, raw, { flag: 'wx', mode: 0o600 }); return digest(raw) }
const roles = ['candidate', 'recovery'] as const
type Role = typeof roles[number]
type Input = { transportDirectory: string; transportPin: string; directory: string }
type Reference = { path: string; status: number; headers: Record<string, string>; bytes: number; sha256: string; bodyFile: string }
type Row = { service: string; candidate: { referencesPin: string; evidencePin: string; responses: number }; recovery: { referencesPin: string; evidencePin: string; responses: number } }
type Receipt = Pick<Input, 'transportDirectory' | 'transportPin'> & { schemaVersion: number; kind: string; status: string; parserPin: string;
  owners: Record<string, Row>; preview: boolean; productionReady: boolean; activationSupported: boolean; cloudWrites: boolean; credentials: boolean;
  cloudIdentityVerified: boolean; syntheticVersion: boolean }
const version = (role: Role) => `1234abcd-0000-4000-8000-${role === 'candidate' ? '000000000001' : '000000000002'}`
function bytes(file: string) {
  assert.equal(realpathSync(file), path.resolve(file), 'Linked preview input forbidden')
  const stat = statSync(file); assert(stat.isFile() && stat.size <= 16 * 1024 * 1024, 'Preview input budget exceeded'); return readFileSync(file)
}
function pinned<T>(file: string, pin: string): T {
  assert(/^[a-f0-9]{64}$/.test(pin), 'External preview pin required')
  const raw = bytes(file); assert.equal(digest(raw), pin, 'Preview input changed'); return JSON.parse(raw.toString()) as T
}
function references(transport: string, owner: string, role: Role, pin: string) {
  const http = path.join(transport, owner, role, 'http'), rows = pinned<Reference[]>(path.join(http, 'references.json'), pin)
  return unifiedPreviewReferences(rows, (row: Reference, index: number) => {
    assert.equal(row.bodyFile, `${index}.body`); return bytes(path.join(http, row.bodyFile))
  })
}

// Connect only to loopback; the exact preview name is the HTTP Host, not a
// forwarded-header approximation. No DNS, TLS or immutable cloud UUID is claimed.
export function unifiedLoopbackRequest(loopback: string, exactOrigin: string) {
  const local = new URL(loopback)
  assert.equal(local.protocol, 'http:'); assert.equal(local.hostname, '127.0.0.1')
  assert(local.port && local.pathname === '/' && !local.search && !local.hash && !local.username && !local.password)
  const exact = new URL(exactOrigin)
  return async (input: string | URL | Request, options: RequestInit = {}) => {
    const url = new URL(input instanceof Request ? input.url : input); assert.equal(url.origin, exactOrigin)
    assert.equal(options.method ?? (input instanceof Request ? input.method : 'GET'), 'GET')
    return new Promise<Response>((done, fail) => {
      const req = http.get(new URL(url.pathname, local), { signal: options.signal ?? undefined,
        headers: { host: exact.host, 'accept-language': new Headers(options.headers).get('accept-language') ?? 'zh' } }, response => {
        const parts: Buffer[] = []; let total = 0
        response.on('data', chunk => { total += chunk.length; if (total > 16 * 1024 * 1024) req.destroy(new Error('Loopback preview body budget exceeded')); else parts.push(chunk) })
        response.on('error', fail)
        response.on('end', () => {
          try {
            const headers = new Headers()
            for (const [name, value] of Object.entries(response.headers)) for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) headers.append(name, item)
            done(new Response(Buffer.concat(parts), { status: response.statusCode, headers }))
          } catch (error) { fail(error) }
        })
      })
      req.setTimeout(30000, () => req.destroy(new Error('Loopback preview timeout'))); req.on('error', fail)
    })
  }
}

export async function prepareUnifiedPreviewContract(input: Input, { serve = serveUnifiedWorker } = {}): Promise<{ directory: string; previewPin: string; receipt: Receipt }> {
  const transport = await verifyUnifiedTransport(input.transportDirectory, input.transportPin), root = path.resolve(input.directory)
  assert.equal(realpathSync(path.dirname(root)), path.dirname(root), 'Linked preview parent forbidden')
  const publication = transport.receipt.publicationDirectory
  const pub = JSON.parse(bytes(path.join(publication, 'publication.json')).toString()) as { buildDirectory: string; previousPath: string }
  const previous = JSON.parse(bytes(pub.previousPath).toString()) as { owners: Record<string, { directory: string }> }
  for (const source of [transport.directory, publication, pub.buildDirectory, ...Object.values(previous.owners).map(row => row.directory)]) {
    assert(root !== source && !root.startsWith(source + path.sep) && !source.startsWith(root + path.sep), 'Preview output overlaps input')
  }
  assertDiskBudget({ path: root, operation: 'unified preview host acceptance', estimatedBytes: GiB })
  mkdirSync(root, { mode: 0o700 })
  return withRunLock(root, async () => {
    const state = path.join(root, 'state.json'), owners: Receipt['owners'] = {}
    save(state, { status: 'preparing', cloudWrites: false }); mkdirSync(path.join(root, 'home'), { mode: 0o700 })
    try {
      for (const [owner, row] of Object.entries(transport.receipt.owners)) {
        mkdirSync(path.join(root, owner), { mode: 0o700 }); const results: Partial<Row> = {}
        for (const role of roles) {
          const directory = path.join(root, owner, role); mkdirSync(directory, { mode: 0o700 })
          const refs = references(transport.directory, owner, role, row[role].referencesPin)
          const referencesPin = save(path.join(directory, 'references.json'), refs)
          const configPath = path.join(directory, 'local.json'), config = bytes(path.join(transport.directory, owner, role, 'local.json'))
          assert.equal(digest(config), row[role].localConfigPin); writeFileSync(configPath, config, { flag: 'wx', mode: 0o600 })
          let evidencePin = ''
          await serve(path.join(pub.buildDirectory, 'source/apps', owner === 'main' ? 'web' : `game-${owner}`), configPath,
            path.join(root, 'home'), path.join(directory, 'local.log'), async (loopback: string) => {
              const result = await verifyUnifiedVersionPreview({ service: row.service, versionId: version(role), references: refs,
                directory: path.join(directory, 'http'), observationMode: 'loopback_exact_host',
                request: unifiedLoopbackRequest(loopback, exactUnifiedPreviewOrigin(row.service, version(role))) })
              evidencePin = result.evidenceSHA256
            })
          results[role] = { referencesPin, evidencePin, responses: refs.length }
        }
        owners[owner] = { service: row.service, candidate: results.candidate!, recovery: results.recovery! }
      }
      await verifyUnifiedTransport(input.transportDirectory, input.transportPin)
      const receipt: Receipt = { schemaVersion: 1, kind: 'unified_local_exact_host_contract', status: 'all_local_preview_hosts_accepted',
        transportDirectory: transport.directory, transportPin: input.transportPin, parserPin: unifiedHTMLParserPin(), owners,
        preview: transport.receipt.preview, productionReady: false, activationSupported: false, cloudWrites: false, credentials: false,
        cloudIdentityVerified: false, syntheticVersion: true }
      writeFileSync(state, json({ status: 'complete', cloudWrites: false }), { mode: 0o600 })
      const previewPin = save(path.join(root, 'preview.json'), receipt)
      await verifyUnifiedPreviewContract(root, previewPin); return { directory: root, previewPin, receipt }
    } catch (error) { writeFileSync(state, json({ status: 'failed', cloudWrites: false, error: (error as Error).message }), { mode: 0o600 }); throw error }
  })
}

export async function verifyUnifiedPreviewContract(directory: string, previewPin: string): Promise<{ directory: string; previewPin: string; receipt: Receipt }> {
  const root = path.resolve(directory); assert.equal(realpathSync(root), root)
  const receipt = pinned<Receipt>(path.join(root, 'preview.json'), previewPin)
  assert.equal(receipt.schemaVersion, 1); assert.equal(receipt.kind, 'unified_local_exact_host_contract'); assert.equal(receipt.status, 'all_local_preview_hosts_accepted')
  for (const key of ['productionReady', 'activationSupported', 'cloudWrites', 'credentials', 'cloudIdentityVerified'] as const) assert.equal(receipt[key], false)
  assert.equal(receipt.syntheticVersion, true); assert.equal(receipt.parserPin, unifiedHTMLParserPin())
  assert.deepEqual(JSON.parse(bytes(path.join(root, 'state.json')).toString()), { status: 'complete', cloudWrites: false })
  const transport = await verifyUnifiedTransport(receipt.transportDirectory, receipt.transportPin)
  assert.equal(receipt.preview, transport.receipt.preview)
  assert.deepEqual(Object.keys(receipt.owners), Object.keys(transport.receipt.owners))
  for (const [owner, row] of Object.entries(receipt.owners)) {
    const source = transport.receipt.owners[owner]; assert.equal(row.service, source.service)
    for (const role of roles) {
      const target = path.join(root, owner, role), refs = references(transport.directory, owner, role, source[role].referencesPin)
      assert.deepEqual(pinned(path.join(target, 'references.json'), row[role].referencesPin), refs)
      assert.equal(digest(bytes(path.join(target, 'local.json'))), source[role].localConfigPin)
      assert.equal(row[role].responses, refs.length)
      recheckUnifiedPreview(path.join(target, 'http'), row[role].evidencePin, { service: row.service, versionId: version(role),
        references: refs, observationMode: 'loopback_exact_host' })
    }
  }
  return { directory: root, previewPin, receipt }
}
