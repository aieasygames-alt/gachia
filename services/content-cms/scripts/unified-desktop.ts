import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { assertUnifiedDesktopEnvironment, assertUnifiedInstalledApplication, loadUnifiedDesktopPlan, parseUnifiedDesktopArguments,
  readPinnedUnifiedInput, readUnifiedPublishedSelection, unifiedSelection } from '../src/unified-desktop'
import { importUnifiedPlan } from '../src/unified-plan'
import { exportUnifiedContent, type SourceBytes } from '../src/unified-export'
import { digest } from '../src/legacy-intake'
import { projectRoot } from '../src/local-environment'

const { action, options } = parseUnifiedDesktopArguments(process.argv.slice(2))
const { root } = assertUnifiedDesktopEnvironment()
assertUnifiedInstalledApplication(root, projectRoot)
const { plan, originals, root: repo } = loadUnifiedDesktopPlan(options.get('--repo')!, options.get('--pin')!)
if (action === 'import') assert(plan.games.includes(options.get('--scope')!), 'Explicit registered import scope required')
const keys = action === 'import' ? [] : unifiedSelection(readPinnedUnifiedInput(options.get('--selection')!, options.get('--selection-pin')!), plan)
const active = action === 'import' ? [] : readPinnedUnifiedInput(options.get('--active')!, options.get('--active-pin')!) as SourceBytes[]
assert(Array.isArray(active), 'Complete active baseline array required')
const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
const save = (file: string, value: unknown) => {
  const text = JSON.stringify(value, null, 2) + '\n'
  writeFileSync(file, text, { flag: 'wx', mode: 0o600 })
  return digest(text)
}
try {
  if (action === 'import') {
    const scope = options.get('--scope')!
    console.log(JSON.stringify({ action, scope, planSHA256: plan.planSHA256, ...await importUnifiedPlan(payload, plan, [scope]) }))
  } else {
    const selected = await readUnifiedPublishedSelection(payload, plan, keys)
    const candidate = exportUnifiedContent(selected.records, originals, active, false)
    assert.equal(candidate.manifest.status, 'editorial_candidate', 'No new approved editorial changes')
    let directory: string, frozen
    if (action === 'freeze') {
      const { freezeUnifiedContent } = await import('../src/unified-build')
      frozen = freezeUnifiedContent({ repo, commit: options.get('--commit')!, directory: options.get('--output')!,
        plan, records: selected.records, activeSources: active, preview: false })
      directory = frozen.directory
    } else {
      directory = path.join(root, 'publish/unified', candidate.manifest.candidateSHA256)
      mkdirSync(path.dirname(directory), { recursive: true, mode: 0o700 })
      mkdirSync(directory, { mode: 0o700 })
      for (const [index, file] of candidate.files.entries()) writeFileSync(path.join(directory, `${index}.candidate`), file.content, { flag: 'wx', mode: 0o600 })
      save(path.join(directory, 'candidate.json'), candidate.manifest)
    }
    const reread = await readUnifiedPublishedSelection(payload, plan, keys)
    assert.equal(reread.reviewPin, selected.reviewPin, 'Published review changed during preparation; discard this attempt')
    const receipt = { schemaVersion: 1, kind: 'unified_desktop_editorial_selection', planSHA256: plan.planSHA256,
      candidateSHA256: candidate.manifest.candidateSHA256, changed: candidate.manifest.changed,
      selectionPin: options.get('--selection-pin'), activePin: options.get('--active-pin'),
      reviews: selected.reviews, reviewPin: selected.reviewPin, frozenManifestPin: frozen?.manifestPin ?? null,
      preview: false, cmsMode: 'desktop', productionReady: false, activationSupported: false, cloudWrites: false }
    const editorialPin = save(path.join(directory, 'editorial.json'), receipt)
    console.log(JSON.stringify({ action, directory, editorialPin, ...receipt }))
  }
} finally { await payload.destroy() }
