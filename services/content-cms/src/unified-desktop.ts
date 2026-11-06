import assert from 'node:assert/strict'
import { lstatSync, readFileSync, realpathSync } from 'node:fs'
import { homedir } from 'node:os'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import type { Payload } from 'payload'
import { cmsEnvironment } from './cms-environment'
import { baselineDirectory } from './inventory-baseline'
import { digest } from './legacy-intake'
import { canonical } from './record-mapping'
import { readUnifiedSources } from './unified-sources'
import { unifiedPlan, verifyUnifiedPlan, type UnifiedPlan } from './unified-plan'
import { validateUnifiedRecord, type UnifiedRecord } from './unified-content'
import type { SourceBytes } from './unified-export'

const SHA = /^[a-f0-9]{64}$/
const common = ['--repo', '--pin']
const exportOptions = [...common, '--selection', '--selection-pin', '--active', '--active-pin']
const contracts: Record<string, string[]> = {
  import: [...common, '--scope'], export: exportOptions, freeze: [...exportOptions, '--commit', '--output'],
}

export function parseUnifiedDesktopArguments(args: string[]) {
  const [action, ...flags] = args
  assert(Object.hasOwn(contracts, action), 'Expected unified desktop import, export or freeze')
  const options = new Map<string, string>()
  for (let i = 0; i < flags.length; i += 2) {
    const key = flags[i], value = flags[i + 1]
    assert(contracts[action].includes(key) && !options.has(key) && value && !value.startsWith('--'), 'Unknown, duplicate or missing unified desktop argument')
    options.set(key, value)
  }
  assert(contracts[action].every(key => options.has(key)), 'Required unified desktop arguments missing')
  for (const [key, value] of options) if (key === '--pin' || key.endsWith('-pin')) assert(SHA.test(value), 'Expected SHA-256 pin')
  if (action === 'freeze') assert(/^[a-f0-9]{40}$/.test(options.get('--commit')!), 'Exact source commit required')
  return { action: action as 'import' | 'export' | 'freeze', options }
}

export function assertUnifiedDesktopEnvironment(env: Record<string, string | undefined> = process.env) {
  const runtime = cmsEnvironment(env)
  const root = path.join(homedir(), 'Library/Application Support/GachiaCMS')
  assert.equal(runtime.mode, 'desktop', 'Unified desktop commands require the installed desktop')
  assert.equal(runtime.directory, path.join(root, 'data'), 'Unexpected desktop data directory')
  assert(!env.CI && !env.GITHUB_ACTIONS, 'Unified desktop commands cannot run in CI')
  return { runtime, root }
}

export function assertUnifiedInstalledApplication(root: string, app: string) {
  const settings = path.join(root, 'settings.json')
  assert.equal(realpathSync(settings), settings, 'Linked desktop settings forbidden')
  const configured = JSON.parse(readFileSync(settings, 'utf8'))
  assert(typeof configured.app === 'string' && configured.app === app && realpathSync(app) === app
    && app.startsWith(path.join(root, 'releases') + path.sep), 'Only the currently installed application may access the desktop database')
}

export function readPinnedUnifiedInput(file: string, pin: string): unknown {
  assert(SHA.test(pin), 'External input pin required')
  const absolute = path.resolve(file)
  assert.equal(realpathSync(absolute), absolute, 'Linked editorial input forbidden')
  assert(lstatSync(absolute).isFile() && lstatSync(absolute).size <= 32 * 1024 * 1024, 'Editorial input byte budget exceeded')
  const bytes = readFileSync(absolute), text = bytes.toString('utf8')
  assert(Buffer.from(text).equals(bytes) && digest(text) === pin, 'Editorial input pin or UTF-8 mismatch')
  return JSON.parse(text)
}

export function loadUnifiedDesktopPlan(repo: string, pin: string) {
  const root = path.resolve(repo)
  assert.equal(realpathSync(root), root, 'Linked repository forbidden')
  const inventory = JSON.parse(readFileSync(path.join(root, baselineDirectory, 'inventory.json'), 'utf8'))
  const { sources } = readUnifiedSources(root)
  const plan = unifiedPlan(sources, inventory.scopes.map((scope: { id: string }) => scope.id))
  assert.equal(plan.planSHA256, pin, 'Recompute and explicitly pin the current unified plan')
  const known = new Set(plan.sources.map(source => source.sourcePath))
  const originals: SourceBytes[] = sources.filter(source => known.has(source.sourcePath)).map(source =>
    ({ sourcePath: source.sourcePath, text: source.rawText, sha256: source.sourceDigest }))
  return { root, plan, originals }
}

export function unifiedSelection(value: unknown, plan: UnifiedPlan) {
  verifyUnifiedPlan(plan)
  assert(value && typeof value === 'object' && !Array.isArray(value), 'Explicit editorial selection required')
  const selection = value as { stableKeys?: unknown }
  assert.deepEqual(Object.keys(selection), ['stableKeys'], 'Selection cannot supply records, approval or activation flags')
  assert(Array.isArray(selection.stableKeys) && selection.stableKeys.length > 0 && selection.stableKeys.length <= 200, 'Select 1-200 reviewed records')
  const known = new Set(plan.sources.flatMap(source => source.records.map(record => record.stableKey)))
  const keys: string[] = []
  for (const key of selection.stableKeys) {
    assert(typeof key === 'string' && known.has(key) && !keys.includes(key), 'Unknown or duplicate editorial identity')
    keys.push(key)
  }
  return keys.sort()
}

export async function readUnifiedPublishedSelection(payload: Payload, plan: UnifiedPlan, keys: string[]) {
  assert.deepEqual(unifiedSelection({ stableKeys: keys }, plan), keys, 'Canonical editorial selection required')
  const result = await payload.find({ collection: 'content-records', overrideAccess: true, draft: false, locale: 'all', depth: 0,
    pagination: false, where: { and: [{ stableKey: { in: keys } }, { _status: { equals: 'published' } }, { hold: { equals: false } }] } })
  const games = await payload.find({ collection: 'games', overrideAccess: true, pagination: false, depth: 0 })
  return verifyUnifiedPublishedDocuments(plan, keys, result.docs, games.docs)
}

export function verifyUnifiedPublishedDocuments(plan: UnifiedPlan, keys: string[], inputDocuments: object[], games: { id: unknown; key: unknown }[]) {
  assert(Array.isArray(inputDocuments) && inputDocuments.every(doc => doc && typeof doc === 'object' && !Array.isArray(doc)), 'Formal documents required')
  const documents = inputDocuments as Record<string, unknown>[]
  assert.deepEqual(unifiedSelection({ stableKeys: keys }, plan), keys, 'Canonical editorial selection required')
  assert.deepEqual(documents.map(doc => doc.stableKey).sort(), keys, 'Selected records must all be published and approved; drafts cannot substitute')
  const templates = new Map(plan.sources.flatMap(source => source.records.map(record => [record.stableKey, record] as const)))
  const gameKeys = new Map(games.map(game => [game.id, game.key]))
  const records = [...documents].sort((a, b) => String(a.stableKey).localeCompare(String(b.stableKey))).map(doc => {
    assert.equal(doc._status, 'published', 'Draft cannot substitute for approved content')
    assert.equal(doc.hold, false, 'Held content cannot enter production')
    assert(typeof doc.id === 'number' || typeof doc.id === 'string')
    assert(typeof doc.updatedAt === 'string' && Number.isFinite(Date.parse(doc.updatedAt)), 'Review timestamp required')
    assert(typeof doc.stableKey === 'string')
    const template = templates.get(doc.stableKey)!
    validateUnifiedRecord(doc as unknown as Record<string, unknown>)
    assert(isDeepStrictEqual(doc.sourceRecord, template.sourceRecord), 'Published source differs from pinned plan')
    const gameId = doc.game && typeof doc.game === 'object' ? (doc.game as { id: unknown }).id : doc.game
    assert.equal(gameKeys.get(gameId), template.sourceRecord.game, 'Published record belongs to another game')
    return doc
  })
  const reviews = records.map(doc => ({ id: doc.id, stableKey: doc.stableKey, updatedAt: doc.updatedAt,
    sourceSHA256: digest(canonical(doc.sourceRecord)), valueSHA256: digest(canonical(doc.structuredValue)) }))
  return { records: records as unknown as UnifiedRecord[], reviews, reviewPin: digest(canonical(reviews)) }
}
