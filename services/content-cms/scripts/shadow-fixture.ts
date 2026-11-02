import { writeFile } from 'node:fs/promises'
import { buildShadowSnapshot, buildShadowRelease } from '../src/shadow-release'

const asOf = '2026-10-31T00:00:00.000Z'
const store = new Map<string, any>()
for (const game of ['genshin', 'nte']) {
  const snapshot = buildShadowSnapshot(game, [{ path: `/zh/${game}/characters/index`, title: `${game} characters`, body: 'Approved local shadow fixture', expiresAt: null, disposition: 'approved-fixture' }], true, asOf)
  store.set(snapshot.snapshotKey, snapshot)
}
const release = buildShadowRelease(['genshin', 'nte'], Object.fromEntries([...store].map(([key, value]) => [value.game, key])), store, { genshin: ['shadow-page-v1'], nte: ['shadow-page-v1'] }, asOf)
await writeFile('../../reports/shadow-fixture-2026-10-31.json', `${JSON.stringify({ release, snapshots: Object.fromEntries([...store].map(([key, value]) => [key, value])) }, null, 2)}\n`)
console.log(release.releaseKey)
