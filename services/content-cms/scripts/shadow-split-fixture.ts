import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { buildShadowSnapshot, buildShadowRelease, SHADOW_SCHEMA } from '../src/shadow-release'
import { projectRoot } from '../src/local-environment'
const asOf = '2026-11-01T00:00:00.000Z'
const row = (path: string, title: string) => ({ path, title, body: `Synthetic split ownership: ${title}`, expiresAt: null, disposition: 'approved-fixture' as const })
const snapshots = [buildShadowSnapshot('genshin', [row('/zh/genshin/characters/index', 'Genshin fixture')], true, asOf),
  buildShadowSnapshot('nte', [row('/zh/nte/characters/index', 'NTE character fixture'), row('/zh/nte/items/ore', 'Main NTE item fixture')], true, asOf)]
const store = new Map(snapshots.map(snapshot => [snapshot.snapshotKey, snapshot]))
const release = buildShadowRelease(['genshin', 'nte'], Object.fromEntries(snapshots.map(snapshot => [snapshot.game, snapshot.snapshotKey])), store,
  { main: [SHADOW_SCHEMA], nte: [SHADOW_SCHEMA], genshin: [SHADOW_SCHEMA] }, asOf)
await writeFile(path.resolve(projectRoot, '../../reports/payload-next-phase-2026-11-01/shadow-split-fixture.json'), JSON.stringify({ release, snapshots: Object.fromEntries(store) }, null, 2) + '\n', { flag: 'wx' })
console.log(release.releaseKey)
