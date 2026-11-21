import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { assertGenshinReviewedExport } from '../src/genshin-collection-publication'
import { digest } from '../src/legacy-intake'
import { canonical } from '../src/record-mapping'
const input = JSON.parse(gunzipSync(readFileSync(new URL('../reviews/2026-11-20-genshin-resume-r141.json.gz', import.meta.url))).toString()).input
const exported = JSON.parse(gunzipSync(readFileSync(new URL('../../../reports/genshin-collection-review-2026-11-21-r142/collection-export-final.json.gz', import.meta.url))).toString()).result
const resign = (e: any) => { const { exportKey, ...m } = e.manifest; e.manifest.exportKey = digest(canonical(m)); return e }
test('exact reviewed complete export is independently reconstructed', () => {
  const result = assertGenshinReviewedExport(input, exported)
  assert.equal(result.sources.length, 115); assert.equal(result.review.items.length, 221)
})
test('re-signed partial or rejected decisions cannot qualify', () => {
  for (const mutate of [(e: any) => e.manifest.decisions.pop(), (e: any) => e.manifest.decisions[0].action = 'reject',
    (e: any) => e.manifest.decisions[0] = e.manifest.decisions[1]]) {
    const e = structuredClone(exported); mutate(e); assert.throws(() => assertGenshinReviewedExport(input, resign(e)))
  }
})
test('other game bytes, missing summaries and mixed candidate recovery are rejected', () => {
  for (const mutate of [(e: any) => e.sources[0].text += '\n',
    (e: any) => e.sources.splice(e.sources.findIndex((r: any) => r.sourcePath.endsWith('genshin/raw-character-summaries.json')), 1),
    (e: any) => e.recoverySources = e.sources]) {
    const e = structuredClone(exported); mutate(e); assert.throws(() => assertGenshinReviewedExport(input, e))
  }
})
