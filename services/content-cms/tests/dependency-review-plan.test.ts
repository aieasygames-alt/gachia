import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { snapshot, digest } from '../src/legacy-intake'
import { canonical, mapBatch } from '../src/record-mapping'
import { dependencyReviewPlan, verifyDependencyReviewPlan } from '../src/dependency-review-plan'
import routes from '../../../packages/core/route-ownership.json'

const policy = { digest: digest(canonical(routes)), routes }
function candidates(game: string, ids: string[]) {
  return mapBatch([snapshot(game, `packages/data/games/${game}/raw-materials.json`, 'raw-json', JSON.stringify(ids.map(id => ({ id, name: id, type: 'ore', rarity: 1 }))))], policy).sources[0].records
}
const relations = [{ characterId: 'zero', levelingMaterials: [{ levelRange: '1-10', materials: [{ id: 'Ore', quantity: 2 }, { id: 'Ore', quantity: 3 }] }], skillMaterials: [{ id: 'unknown', quantity: 1 }] }]
const characters = [{ id: 'zero-male' }, { id: 'zero-female' }]

test('review plans retain every source pointer, distinguish ambiguity, and never approve lexical hints', () => {
  const rows = candidates('nte', ['ore'])
  const plan = dependencyReviewPlan('nte', rows, relations, characters)
  assert.deepEqual(plan.counts, { issues: 2, references: 3, noCandidate: 1, singleCandidate: 1, ambiguous: 0 })
  const ore = plan.issues.find(i => i.missingId === 'Ore')!
  assert.deepEqual(ore.candidateHints, [{ targetId: 'ore', reason: 'case-or-separator' }])
  assert.deepEqual(ore.references.map(r => r.quantity), [2, 3])
  for (const issue of plan.issues) {
    assert.equal(issue.status, 'needs-source-review')
    assert.equal(issue.approvedTarget, null)
    for (const reference of issue.references) {
      let value: unknown = relations
      for (const key of reference.pointer.split('/').slice(1)) value = (value as Record<string, unknown>)[key]
      assert.equal(value, issue.missingId)
    }
  }
  assert.equal(plan.executable, false)
  assert.equal(plan.publishable, false)
  assert.deepEqual(verifyDependencyReviewPlan(plan, 'nte', rows, relations, characters), plan)
})

test('approved NTE canonical Zero identity resolves to both display variants without lexical approval', () => {
  const rows = candidates('nte', ['ore'])
  const plan = dependencyReviewPlan('nte', rows, relations, characters)
  assert.deepEqual(plan.issues.map(issue => issue.missingId), ['Ore', 'unknown'])
  assert.deepEqual(plan.characterIdentityResolutions.map(identity => ({
    sourceId: identity.sourceId,
    canonicalId: identity.canonicalId,
    displayVariantIds: identity.displayVariantIds,
    resolution: identity.resolution,
  })), [{
    sourceId: 'zero',
    canonicalId: 'zero',
    displayVariantIds: ['zero-male', 'zero-female'],
    resolution: 'approved-canonical-identity',
  }])
  assert.equal(plan.issues.some(issue => issue.kind === 'character'), false)
})

test('source changes, hand-edited hints and approvals invalidate saved review plans', () => {
  const rows = candidates('nte', ['ore']), plan = dependencyReviewPlan('nte', rows, relations, characters)
  const edited = structuredClone(plan)
  edited.issues[0].candidateHints.length = 0
  assert.throws(() => verifyDependencyReviewPlan(edited, 'nte', rows, relations, characters), /Stale or altered/)
  assert.throws(() => verifyDependencyReviewPlan({ ...plan, executable: true }, 'nte', rows, relations, characters), /Stale or altered/)
  const changed = structuredClone(relations)
  changed[0].levelingMaterials[0].materials[0].quantity++
  assert.throws(() => verifyDependencyReviewPlan(plan, 'nte', rows, changed, characters), /Stale or altered/)
  assert.throws(() => verifyDependencyReviewPlan(plan, 'nte', candidates('nte', ['ore', 'extra']), relations, characters), /Stale or altered/)
  assert.throws(() => verifyDependencyReviewPlan(plan, 'nte', rows, relations, [...characters, { id: 'zero' }]), /Stale or altered/)
  assert.notEqual(dependencyReviewPlan('nte', rows, changed, characters).issues[0].issueKey, plan.issues[0].issueKey)
})

test('actual source gaps produce reproducible review work, not guessed repairs', async () => {
  for (const game of ['starrail', 'genshin', 'nte']) {
    const read = async (name: string) => JSON.parse(await readFile(new URL(`../../../packages/data/games/${game}/${name}.json`, import.meta.url), 'utf8'))
    const raw = await read('raw-materials'), relationRows = await read('raw-character-materials'), characterRows = await read('raw-characters')
    const rows = mapBatch([snapshot(game, `packages/data/games/${game}/raw-materials.json`, 'raw-json', JSON.stringify(raw))], policy).sources[0].records
    const plan = dependencyReviewPlan(game, rows, relationRows, characterRows)
    assert.equal(plan.issues.length, game === 'starrail' ? 0 : game === 'genshin' ? 55 : 0)
    assert.deepEqual(verifyDependencyReviewPlan(plan, game, rows, relationRows, characterRows), plan)
    if (game === 'genshin') {
      assert.equal(plan.issues.some(i => i.missingId === 'guide-to-freedom' || i.missingId === 'sara'), false)
      assert.equal(plan.issues.find(i => i.missingId === 'mualani')!.status, 'needs-source-review')
    }
    if (game === 'nte') {
      assert.equal(plan.issues.some(i => i.missingId === 'zero'), false)
      assert.deepEqual(plan.characterIdentityResolutions.filter(identity => identity.resolution === 'approved-canonical-identity').map(identity => identity.displayVariantIds), [['zero-male', 'zero-female']])
      assert.deepEqual(plan.issues, [])
    }
  }
})
