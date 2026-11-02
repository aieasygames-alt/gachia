import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { setTimeout as delay } from 'node:timers/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { digest } from '../src/legacy-intake'

if (process.env.CMS_LOCAL_ONLY !== '1' || process.argv.length !== 2) throw new Error('Local HTTP probe only; no arguments')
const root = fileURLToPath(new URL('../../../', import.meta.url)), port = 3317
const child = spawn('pnpm', ['exec', 'next', 'dev', '--turbopack', '--hostname', '127.0.0.1', '--port', String(port)], { cwd: path.join(root, 'apps/web'), env: { ...process.env, CI: '1', PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] })
let output = ''
child.stdout.on('data', chunk => { output += chunk.toString() })
child.stderr.on('data', chunk => { output += chunk.toString() })
async function ready() { for (let i = 0; i < 40; i++) { try { const response = await fetch(`http://127.0.0.1:${port}/zh/nte/items`); if (response.status >= 200) return true } catch {} await delay(500) } return false }
try {
  if (!await ready()) {
    console.log(JSON.stringify({ version: 'material-http-probe-v1', origin: `http://127.0.0.1:${port}`, available: false, reason: 'local app unavailable', diagnostics: output.slice(-2000), runtimeRendered: false, metadataSearchSitemapProbed: false, publishable: false }, null, 2))
    process.exitCode = 0
  } else {
  const raw = JSON.parse(await readFile(path.join(root, 'packages/data/games/nte/raw-materials.json'), 'utf8')) as { id: string }[]
  const ids = [...new Set([raw[0]?.id, raw[Math.floor(raw.length / 2)]?.id, raw.at(-1)?.id].filter(Boolean))]
  const genshinRaw = JSON.parse(await readFile(path.join(root, 'packages/data/games/genshin/raw-materials.json'), 'utf8')) as { id: string }[]
  const genshinIds = [...new Set([genshinRaw[0]?.id, genshinRaw.at(-1)?.id].filter(Boolean))]
  const paths = ['/zh/nte/items', ...ids.map(id => `/zh/nte/items/${id}`), '/zh/nte/items/does-not-exist', '/zh/genshin/items', ...genshinIds.map(id => `/zh/genshin/items/${id}`), '/sitemaps/main/sitemap.xml', '/robots.txt']
  const results = []
  for (const pathname of paths) {
    const response = await fetch(`http://127.0.0.1:${port}${pathname}`, { redirect: 'manual' })
    const text = await response.text()
    const canonical = text.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1] ?? null
    const jsonLdCount = (text.match(/<script[^>]+type=["']application\/ld\+json["']/gi) ?? []).length
    const jsonLdTypes: string[] = [], jsonLdIssues: string[] = [], jsonLdUrls: string[] = []
    for (const match of text.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
      try {
        const value = JSON.parse(match[1]) as Record<string, unknown>
        const graph = Array.isArray(value['@graph']) ? value['@graph'] as Record<string, unknown>[] : [value]
        for (const node of graph) {
          if (typeof node['@type'] === 'string') jsonLdTypes.push(node['@type'])
          if (typeof node.url === 'string') { jsonLdUrls.push(node.url); if (pathname.startsWith('/zh/nte/') && node.url !== `https://gachia.com${pathname}` && node['@type'] !== 'BreadcrumbList') jsonLdIssues.push(`${node['@type']} url mismatch`) }
          if (node['@type'] === 'Article' && (typeof node.headline !== 'string' || typeof node.url !== 'string')) jsonLdIssues.push('Article missing headline/url')
          if (node['@type'] === 'WebPage' && typeof node.url !== 'string') jsonLdIssues.push('WebPage missing url')
          if (node['@type'] === 'BreadcrumbList' && !Array.isArray(node.itemListElement)) jsonLdIssues.push('BreadcrumbList missing itemListElement')
          if (node['@type'] === 'FAQPage' && !Array.isArray(node.mainEntity)) jsonLdIssues.push('FAQPage missing mainEntity')
          if (pathname.includes('/items/') && node['@type'] === 'Product' && typeof node.url !== 'string') jsonLdIssues.push('Product missing url')
          if (node.inLanguage !== undefined && typeof node.inLanguage !== 'string') jsonLdIssues.push('invalid inLanguage')
        }
      } catch { jsonLdIssues.push('invalid JSON-LD') }
    }
    const sitemapLocs = pathname.endsWith('.xml') ? [...text.matchAll(/<loc>([^<]+)<\/loc>/gi)].map(match => match[1]).sort() : null
    results.push({ path: pathname, status: response.status, location: response.headers.get('location'), contentType: response.headers.get('content-type'), hasTitle: /<title[ >]/i.test(text), hasRobots: /noindex|nofollow/i.test(text), canonical, jsonLdCount, jsonLdTypes, jsonLdUrls, jsonLdIssues, sitemapUrls: sitemapLocs?.length ?? null, sitemapLocs, bytes: Buffer.byteLength(text), bodyDigest: digest(text) })
  }
  const sitemap = results.find(row => row.path === '/sitemaps/main/sitemap.xml')
  const expected = ['zh', 'en', 'ja'].flatMap(locale => raw.map(row => `https://gachia.com/${locale}/nte/items/${row.id}`)).sort()
  const actual = sitemap?.sitemapLocs ?? []
  const missingExpected = expected.filter(url => !actual.includes(url))
  const extraMaterial = actual.filter(url => /https:\/\/gachia\.com\/(?:zh|en|ja)\/nte\/items\//.test(url) && !expected.includes(url))
    .sort()
  console.log(JSON.stringify({ version: 'material-http-probe-v1', origin: `http://127.0.0.1:${port}`, available: true, paths: results, sitemapMaterialAudit: { expectedCount: expected.length, actualCount: actual.length, missingExpected, extraMaterial, complete: missingExpected.length === 0 && extraMaterial.length === 0 }, runtimeRendered: true, metadataSearchSitemapProbed: true, publicTrafficChanged: false, publishable: false }, null, 2))
  }
} finally { child.kill('SIGTERM'); await Promise.race([new Promise(resolve => child.once('exit', resolve)), delay(3000)]); if (!child.killed) child.kill('SIGKILL') }
