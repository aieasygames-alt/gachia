import { spawn, type ChildProcess } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { digest } from '../src/legacy-intake'

if (process.env.CMS_LOCAL_ONLY !== '1' || process.argv.length !== 2) throw new Error('Dedicated owner probe requires local-only mode')
const root = fileURLToPath(new URL('../../../', import.meta.url))
type Target = { owner: string; directory: string; port: number; paths: string[]; media: string }
const targets: Target[] = [
  { owner: 'genshin', directory: 'apps/game-genshin', port: 3321, paths: ['/zh/genshin/items', '/zh/genshin/items/agnidus-agate-sliver', '/zh/genshin/items/does-not-exist', '/sitemap.xml', '/robots.txt'], media: '/images/genshin/characters/hu-tao.webp' },
  { owner: 'nte', directory: 'apps/game-nte', port: 3322, paths: ['/zh/nte/items', '/zh/nte/items/rising-hunter-guide', '/zh/nte/items/does-not-exist', '/sitemap.xml', '/robots.txt'], media: '/images/characters/nanally.webp' },
]
function start(target: Target) {
  return spawn('pnpm', ['exec', 'next', 'dev', '--turbopack', '--hostname', '127.0.0.1', '--port', String(target.port)], { cwd: path.join(root, target.directory), env: { ...process.env, CI: '1', PORT: String(target.port) }, stdio: ['ignore', 'pipe', 'pipe'] })
}
async function probe(target: Target, child: ChildProcess) {
  let diagnostics = ''; child.stdout?.on('data', c => { diagnostics += c.toString() }); child.stderr?.on('data', c => { diagnostics += c.toString() })
  let ready = false
  for (let i = 0; i < 50; i++) { try { const response = await fetch(`http://127.0.0.1:${target.port}${target.paths[0]}`); if (response.status >= 200) { ready = true; break } } catch {} await delay(400) }
  if (!ready) return { owner: target.owner, available: false, diagnostics: diagnostics.slice(-2500) }
  const paths = [...target.paths, target.media], results = []
  for (const pathname of paths) {
    const response = await fetch(`http://127.0.0.1:${target.port}${pathname}`, { redirect: 'manual' }), text = await response.text()
    const canonical = text.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1] ?? null
    const jsonLdTypes = [...text.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].flatMap(match => { try { const value = JSON.parse(match[1]); return (Array.isArray(value?.['@graph']) ? value['@graph'] : [value]).map((row: Record<string, unknown>) => row['@type']).filter((value: unknown): value is string => typeof value === 'string') } catch { return [] } })
    results.push({ path: pathname, status: response.status, contentType: response.headers.get('content-type'), canonical, jsonLdTypes, title: /<title[ >]/i.test(text), robots: /noindex|nofollow/i.test(text), bytes: Buffer.byteLength(text), digest: digest(text) })
  }
  return { owner: target.owner, available: true, results, diagnostics: diagnostics.slice(-2500), runtimeOwner: target.owner, publicTrafficChanged: false }
}
const children = targets.map(start)
try { const results = await Promise.all(targets.map((target, index) => probe(target, children[index]))); console.log(JSON.stringify({ version: 'dedicated-owner-probe-v1', results, publishable: false, realApproval: false }, null, 2)) }
finally { await Promise.all(children.map(async child => { child.kill('SIGTERM'); await Promise.race([new Promise(resolve => child.once('exit', resolve)), delay(3000)]); if (!child.killed) child.kill('SIGKILL') })) }
