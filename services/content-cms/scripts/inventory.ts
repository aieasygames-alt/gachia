import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { projectRoot } from '../src/local-environment'
import { baselineDirectory } from '../src/inventory-baseline'

export { baselineDirectory } from '../src/inventory-baseline'

export function collectInventory(root: string, sourceCommit: string) {
  if (!/^[a-f0-9]{40}$/.test(sourceCommit)) throw new Error('Exact inventory source commit required')
  const read = (file: string) => readFileSync(path.join(root, file), 'utf8')
  const hash = (file: string) => createHash('sha256').update(readFileSync(path.join(root, file))).digest('hex')

  // Read literal registry data only; never execute repository modules during inventory.
  function literal(node: ts.Expression): any {
    if (ts.isAsExpression(node) || ts.isSatisfiesExpression(node)) return literal(node.expression)
    if (ts.isStringLiteral(node)) return node.text
    if (ts.isNumericLiteral(node)) return Number(node.text)
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false
    if (ts.isArrayLiteralExpression(node)) return node.elements.map(value => literal(value))
    if (ts.isObjectLiteralExpression(node)) return Object.fromEntries(node.properties.map(property => {
      if (!ts.isPropertyAssignment(property) || !(ts.isIdentifier(property.name) || ts.isStringLiteral(property.name))) {
        throw new Error('Unsupported registry property; review the inventory parser.')
      }
      return [property.name.text, literal(property.initializer)]
    }))
    throw new Error(`Unsupported registry expression: ${node.getText()}`)
  }

  function constant(file: string, name: string) {
    const tree = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true)
    for (const statement of tree.statements) {
      if (!ts.isVariableStatement(statement)) continue
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.name.text === name && declaration.initializer) return literal(declaration.initializer)
      }
    }
    throw new Error(`Missing ${name} in ${file}`)
  }

  const files = [...new Set(execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', 'apps', 'packages', 'scripts/scaffold-game.mjs', 'scripts/genshin-content-assets.mjs', 'scripts/nte-content-assets.mjs'],
    { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }).split('\0').filter(file => file && existsSync(path.join(root, file))))].sort()
  const ids: string[] = constant('packages/core/constants/index.ts', 'GAME_IDS')
  const games = constant('packages/core/constants/index.ts', 'GAMES')
  const deployments = constant('packages/core/deployments.ts', 'GAME_DEPLOYMENTS')
  const ownership = JSON.parse(read('packages/core/route-ownership.json'))
  const review = JSON.parse(read('packages/data/raw-content-review.json'))
  if (new Set(ids).size !== ids.length || JSON.stringify([...ids].sort()) !== JSON.stringify(Object.keys(games).sort())) throw new Error('Registry mismatch')
  const scopedData = files.filter(file => file.startsWith('packages/data/games/'))
  for (const file of scopedData) if (!ids.includes(file.split('/')[3])) throw new Error(`Unregistered content scope: ${file}`)
  for (const id of Object.keys(ownership.games)) if (!ids.includes(id)) throw new Error(`Unregistered route owner: ${id}`)

  const sharedCandidates = files.filter(file => (/\.(ts|tsx|json|mjs)$/.test(file) || (file.startsWith('packages/core/vendor/streamparser-json/') && file.endsWith('.js'))) && (
    file.startsWith('apps/web/app/[lang]/[game]/') ||
    file.startsWith('apps/web/lib/game-data/') ||
    file.startsWith('packages/ui/') ||
    file.startsWith('apps/web/public/data-manifest/') ||
    file.startsWith('packages/core/vendor/streamparser-json/') ||
    ['apps/web/lib/version-snapshots.ts', 'apps/web/lib/redeem-codes.ts', 'packages/data/index.ts', 'packages/data/lib/game-data-access.ts', 'packages/data/load-json.ts', 'packages/core/constants/index.ts', 'packages/core/types/index.ts', 'apps/web/lib/games/registry.ts', 'apps/web/app/sitemaps/main/sitemap.ts', 'packages/data/scripts/generate-manifests.mjs', 'scripts/scaffold-game.mjs',
      'packages/core/genshin-map.ts', 'apps/router/src/index.ts', 'apps/router/src/genshin-map.ts',
      'apps/web/app/api/map/route.ts', 'apps/web/app/api/map/points/route.ts', 'apps/web/app/api/map/tile/route.ts', 'apps/web/app/api/map/progress/route.ts',
      'apps/web/app/[lang]/page.tsx', 'apps/web/lib/homepage-content.ts', 'apps/web/lib/genshin-platform-content.ts',
      'apps/web/public/data-client/genshin-platform.json', 'packages/core/genshin-content.json', 'packages/core/genshin-platform.ts',
      'packages/data/scripts/game-public-projections.mjs', 'packages/data/scripts/main-manifests.mjs', 'scripts/genshin-content-assets.mjs',
      'packages/core/nte-content.json', 'packages/core/nte-platform.ts', 'apps/router/src/nte-content.ts',
      'apps/web/lib/nte-platform-content.ts', 'apps/web/public/data-client/nte-platform.json', 'scripts/nte-content-assets.mjs'].includes(file)
  ))
  const scopes = ids.map(id => {
    const dedicated = deployments[id]?.deployment === 'game'
    const sourceFiles = scopedData.filter(file => file.startsWith(`packages/data/games/${id}/`))
    const mirrors = files.filter(file => file.startsWith(`apps/web/public/data/${id}/`))
    const derivedFiles = files.filter(file => file.startsWith(`apps/web/public/data-client/${id}/`))
    const appCandidates = files.filter(file => file.startsWith(`apps/game-${id}/`) && ((/\.(ts|tsx|json)$/.test(file) && !/test\.|\.test\.|tsconfig|package\.json/.test(file))
      || file.startsWith(`apps/game-${id}/public/_games/${id}/vendor/`)))
    const resourceFiles = files.filter(file => file.startsWith(`apps/game-${id}/public/`) || file.startsWith(`apps/web/public/images/${id}/`))
    return {
      id, names: games[id].name, registry: games[id],
      region: id === 'roco-cn' ? 'cn' : id === 'roco' ? 'global' : 'unverified',
      routeOwnership: { defaultOwner: 'main', dedicatedWorker: dedicated ? deployments[id].worker : null, contract: ownership.games[id] || null, liveBindingsVerified: false },
      authority: 'legacy', migrationStatus: 'inventory-only', accountableEditor: null,
      contentKindsFromRawFilenames: sourceFiles.filter(file => /\/raw-.*\.json$/.test(file)).map(file => path.basename(file, '.json').slice(4)),
      sourceFiles: sourceFiles.map(file => ({ path: file, sha256: hash(file) })),
      publicMirrors: mirrors.map(file => ({ path: file, sha256: hash(file) })),
      derivedFiles: derivedFiles.map(file => ({ path: file, sha256: hash(file) })),
      appCandidates: appCandidates.map(file => ({ path: file, sha256: hash(file) })),
      resourceFiles,
      review: { pairs: review.pairs.filter((file: string) => file.startsWith(`${id}/`)), sourceOnly: review.sourceOnly.filter((item: { path: string }) => item.path.startsWith(`${id}/`)) },
      unresolved: ['Field-level schemas and inline facts', 'Public ID/URL/alias ledger', 'Locale indexability and translation evidence', 'Media rights and external storage inventory', 'Actual consumer/import graph', 'Named editorial owner and acceptance'],
    }
  })
  const inventory = {
    schemaVersion: 1,
    // Keep capture provenance when checking; unrelated documentation commits must not cause drift.
    sourceCommit,
    scope: 'Tracked and non-ignored pending source inventory, not semantic migration or live infrastructure audit; sourceCommit is the capture base',
    scopes,
    sharedCandidates: sharedCandidates.map(file => ({ path: file, sha256: hash(file) })),
    reviewContract: { path: 'packages/data/raw-content-review.json', sha256: hash('packages/data/raw-content-review.json'), pending: review.pending, holds: review.holds },
  }
  return inventory
}

export function renderCoverage(inventory: ReturnType<typeof collectInventory>) {
  const { scopes } = inventory
  return [
    '# 全游戏迁移覆盖基线', '',
    `源码基线：\`${inventory.sourceCommit}\`。由独立 CMS 的 \`pnpm inventory\` 生成；\`pnpm inventory:check\` 检查漂移。`, '',
    '覆盖所有注册游戏/地区 scope；文件清单不是运行数据库状态或已完成字段迁移。公开权威仍为旧来源；已有84条guides导入本机不代表全scope已接管。', '',
    '| Scope | 游戏 | 数据文件 | 公共镜像 | 独立应用候选文件 | 路由归属 | 状态 |',
    '|---|---|---:|---:|---:|---|---|',
    ...scopes.map(scope => `| ${scope.id} | ${scope.names.zh} | ${scope.sourceFiles.length} | ${scope.publicMirrors.length} | ${scope.appCandidates.length} | ${scope.routeOwnership.dedicatedWorker ? `${scope.routeOwnership.dedicatedWorker} + Main 按路径分工` : 'Main'} | 待字段映射/责任人确认 |`),
    '',
    '## 边界与缺口', '',
    '- 16 个技术 scope 包括 roco/roco-cn 地区差异；对应产品口径约 15 款游戏。地区不是语言。',
    '- NTE 的 items 详情已纳入独立应用路由合同；生产迁移与单 Worker 发布须另有真实完成回执。绿梦独立 owner 只覆盖 zh。共享搜索、导航、图片与 sitemap 仍按路径分工。',
    '- 绿梦没有 packages/data/games 目录，内容在独立应用 TypeScript/页面中，不能按 JSON 数量判断迁移完整性。',
    '- JSON 保留 raw 文件类型、源/镜像路径和 SHA-256；独立应用与共享组件为待人工确认的候选，包含渲染代码，不表示全部是内容。',
    '- sharedCandidates 是横跨全部 scope 的公共候选池。外部 R2、非约定目录素材、非注册文件、运行时来源和具体消费者仍待核实；本次没有访问生产存储。',
    '- reviewContract 保存旧审阅门禁引用与 pending/holds；导入时必须保留 evidence/hold 语义，不能以快照中的空列表代替迁移时检查。',
    '- 退出 P0 还需每类内容字段/URL/别名/locale/责任人对账；不能因清单覆盖全游戏就把 P0、P2 标为完成。',
    '',
  ].join('\n')
}

export function checkInventory(root: string, inventory: ReturnType<typeof collectInventory>, checking: boolean) {
  const destination = path.join(root, baselineDirectory)
  if (!checking && existsSync(destination)) throw new Error('Inventory baseline already exists; select a new revision instead of overwriting history.')
  const table = renderCoverage(inventory)
  for (const [name, data] of [['inventory.json', JSON.stringify(inventory, null, 2) + '\n'], ['coverage.md', table]]) {
    const target = path.join(destination, name)
    if (checking) {
      if (readFileSync(target, 'utf8') !== data) throw new Error(`Inventory drift: ${name}; regenerate and review.`)
    } else {
      mkdirSync(destination, { recursive: true })
      writeFileSync(target, data, { flag: 'wx' })
    }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2)
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) throw new Error('Only --check is supported; historical destinations are immutable')
  const checking = args.length === 1
  const root = path.resolve(projectRoot, '../..')
  const sourceCommit = checking
    ? JSON.parse(readFileSync(path.join(root, baselineDirectory, 'inventory.json'), 'utf8')).sourceCommit
    : execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
  const inventory = collectInventory(root, sourceCommit)
  checkInventory(root, inventory, checking)
  console.log(`Covered ${inventory.scopes.length} scopes; current baseline ${baselineDirectory}; semantic migration pending.`)
}
