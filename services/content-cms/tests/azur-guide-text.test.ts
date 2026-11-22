import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { digest } from '../src/legacy-intake'
import { projectRoot } from '../src/local-environment'
import { readSourceValue, replaceSourceSymbol } from '../src/unified-sources'
import { AZUR_PROMILIA_GUIDE_SOURCE as sourcePath, azurPromiliaGuidePairContract } from '../src/azur-promilia-independent-text'

const original = readFileSync(path.resolve(projectRoot, '../..', sourcePath), 'utf8')
const encode = (text: string) => ({ sourcePath, text, sha256: digest(text) })
const baseline = encode(original)
const guides = (source = baseline): any[] => readSourceValue(source.text, sourcePath, { symbol: 'guides' }) as any[]
const edit = (source: typeof baseline, mutate: (rows: any[]) => void) => {
  const rows = guides(source); mutate(rows)
  return encode(replaceSourceSymbol(source.text, sourcePath, 'guides', rows))
}

test('two successive real-source guide edits derive the current A and exact recovery without a fixed sentence', () => {
  const id = 'kibo-battle-and-ecology'
  const first = edit(baseline, rows => { rows.find(r => r.id === id).content.en += '\n\nFirst reviewed wording.' })
  const second = edit(first, rows => { rows.find(r => r.id === id).content.en += '\n\nSecond reviewed wording & "quotes".' })
  for (const [a, b] of [[baseline, first], [first, second]]) {
    const pair = azurPromiliaGuidePairContract([a], [b]), before = guides(a).find(r => r.id === id), after = guides(b).find(r => r.id === id)
    assert.equal(pair.candidate.changes[0].fields[0].value, after.content.en)
    assert.equal(pair.recovery.changes[0].fields[0].value, before.content.en)
    assert.equal(pair.candidate.changes[0].activeSHA256, a.sha256)
    assert.equal(pair.recovery.changes[0].candidateSHA256, a.sha256)
  }
  assert(azurPromiliaGuidePairContract([first], [second]).candidate.expectations[0].contains[0].includes('&amp; &quot;quotes&quot;'))
})

test('another existing guide derives its own English detail expectation and preserves all other guides', () => {
  const id = guides().find(r => r.id !== 'kibo-battle-and-ecology').id
  const candidate = edit(baseline, rows => { rows.find(r => r.id === id).content.en += '\n\nReviewed English wording.' })
  const pair = azurPromiliaGuidePairContract([baseline], [candidate])
  assert.equal(pair.candidate.changes.length, 1)
  assert.equal(pair.candidate.changes[0].id, id)
  assert.equal(pair.candidate.expectations[0].path, `/en/azur-promilia/guides/${id}`)
  assert.deepEqual(guides(candidate).filter(r => r.id !== id), guides().filter(r => r.id !== id))
})

for (const [name, mutate] of Object.entries({
  'second guide': (rows: any[]) => { rows[1].content.en += ' another edit' },
  'Chinese body': (rows: any[]) => { rows[0].content.zh += ' changed' },
  title: (rows: any[]) => { rows[0].title.en += ' changed' },
  summary: (rows: any[]) => { rows[0].summary.en += ' changed' },
  withdrawal: (rows: any[]) => { rows.pop() },
  membership: (rows: any[]) => { rows.push({ ...rows[0], id: 'new-unreviewed-guide' }) },
  order: (rows: any[]) => { rows.reverse() },
  duplicate: (rows: any[]) => { rows[1].id = rows[0].id },
  empty: (rows: any[]) => { rows[0].content.en = ' ' },
  oversized: (rows: any[]) => { rows[0].content.en = 'x'.repeat(32769) },
  unsafe: (rows: any[]) => { rows[0].content.en = '<script>unreviewed</script>' },
})) test(`guide contract rejects ${name}`, () => {
  const candidate = edit(baseline, rows => { rows[0].content.en += ' reviewed change'; mutate(rows) })
  assert.throws(() => azurPromiliaGuidePairContract([baseline], [candidate]))
})

test('guide contract rejects source corruption, unrelated executable edits, and unknown overlays', () => {
  const candidate = edit(baseline, rows => { rows[0].content.en += ' reviewed change' })
  assert.throws(() => azurPromiliaGuidePairContract([baseline], [{ ...candidate, sha256: '0'.repeat(64) }]), /Corrupt/)
  assert.throws(() => azurPromiliaGuidePairContract([{ ...baseline, sha256: '0'.repeat(64) }], [candidate]), /Corrupt/)
  assert.throws(() => azurPromiliaGuidePairContract([baseline], [encode(candidate.text + '\nexport const injected = true;\n')]), /Non-guide/)
  assert.throws(() => azurPromiliaGuidePairContract([baseline], [candidate, { ...encode('[]'), sourcePath: 'unregistered.json' }]), /Unregistered/)
  assert.throws(() => azurPromiliaGuidePairContract([baseline], [candidate, candidate]), /Duplicate/)
})
