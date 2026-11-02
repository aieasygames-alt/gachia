import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import routes from '../../../packages/core/route-ownership.json'
import { auditMaterialParity } from '../src/material-parity-audit'
import { digest } from '../src/legacy-intake'

if (process.env.CMS_LOCAL_ONLY !== '1' || process.argv.length !== 2) throw new Error('Local route probe only; no arguments')
const root = fileURLToPath(new URL('../../../', import.meta.url))
const exists = async (file: string) => { try { await access(path.join(root, file)); return true } catch { return false } }
const results = []
type Observed = { path: string; owner: string; locale: string; kind: 'collection' | 'detail'; metadata: boolean; search: boolean; sitemap: boolean }
for (const game of ['starrail', 'genshin', 'nte'] as const) {
  const raw = JSON.parse(await readFile(path.join(root, `packages/data/games/${game}/raw-materials.json`), 'utf8')) as { id: string }[]
  const expected = ['zh', 'en', 'ja'].flatMap(locale => [
    { path: `/${locale}/${game}/items`, owner: game === 'nte' ? 'nte' : game === 'genshin' ? 'genshin' : 'main', locale, kind: 'collection' as const },
    ...raw.map(row => ({ path: `/${locale}/${game}/items/${row.id}`, owner: 'main', locale, kind: 'detail' as const })),
  ])
  const observed: Observed[] = []
  for (const row of expected) {
    const dedicated = game === 'genshin' ? 'apps/game-genshin' : game === 'nte' ? 'apps/game-nte' : 'apps/web'
    const section = row.kind === 'collection' ? 'items/page.tsx' : 'items/[id]/page.tsx'
    const file = row.kind === 'collection'
      ? `${dedicated}/app/[lang]/${game}/items/page.tsx`
      : game === 'genshin' ? `${dedicated}/app/[lang]/genshin/items/[id]/page.tsx` : game === 'nte' ? `apps/web/app/[lang]/[game]/items/[id]/page.tsx` : `${dedicated}/app/[lang]/[game]/items/[id]/page.tsx`
    if (await exists(file)) observed.push({ ...row, metadata: false, search: false, sitemap: false })
  }
  const report = auditMaterialParity(expected, observed)
  results.push({ game, expected: expected.length, observed: observed.length, report,
    routeFilesChecked: ['collection', 'detail'].filter(kind => observed.some(row => row.kind === kind)) })
}
console.log(JSON.stringify({ version: 'material-route-probe-v1', source: 'repository-route-templates', sourceDigest: digest(JSON.stringify(routes)), results,
  runtimeRendered: false, metadataSearchSitemapProbed: false, publishable: false, publicTrafficChanged: false }, null, 2))
