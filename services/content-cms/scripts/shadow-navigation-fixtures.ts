import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { buildShadowSnapshot, buildShadowRelease, SHADOW_SCHEMA } from '../src/shadow-release'
import { projectRoot } from '../src/local-environment'
const directory = path.resolve(projectRoot, '../../reports/payload-real-slice-2026-11-01')
const asOf = '2026-11-01T00:00:00.000Z'
for (const version of ['a', 'b']) {
  const row = (pathname: string) => ({ path: pathname, title: `Synthetic ${version} ${pathname}`, body: `Navigation fixture ${version}: ${pathname}`, expiresAt: null, disposition: 'approved-fixture' as const })
  const snapshots = ['genshin', 'nte'].map(game => buildShadowSnapshot(game,
    [...['index', 'next'].map(id => row(`/zh/${game}/characters/${id}`)), ...(game === 'nte' ? ['ore', 'next'].map(id => row(`/zh/nte/items/${id}`)) : [])], true, asOf))
  const store = new Map(snapshots.map(snapshot => [snapshot.snapshotKey, snapshot]))
  const release = buildShadowRelease(['genshin', 'nte'], Object.fromEntries(snapshots.map(snapshot => [snapshot.game, snapshot.snapshotKey])), store,
    { main: [SHADOW_SCHEMA], nte: [SHADOW_SCHEMA], genshin: [SHADOW_SCHEMA] }, asOf)
  writeFileSync(path.join(directory, `navigation-${version}.json`), JSON.stringify({ release, snapshots: Object.fromEntries(store) }, null, 2) + '\n', { flag: 'wx' })
  console.log(JSON.stringify({ version, releaseKey: release.releaseKey, syntheticOnly: true }))
}
