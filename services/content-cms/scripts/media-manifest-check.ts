import { readFile } from 'node:fs/promises'

type Entry = { owner: string; pathname: string; sha256: string; bytes: number; mime: string | null; rights: string; sourcePointer: string }

const file = process.argv[2] ?? '../../reports/owner-media-manifest-2026-10-31.json'
const document = JSON.parse(await readFile(file, 'utf8')) as { schema?: string; entries?: Entry[] }
if (document.schema !== 'media-evidence-v1' || !Array.isArray(document.entries)) throw new Error('Invalid media manifest schema')
const paths = new Set<string>()
for (const entry of document.entries) {
  if (!entry.owner || !entry.pathname.startsWith('/') || paths.has(`${entry.owner}:${entry.pathname}`)) throw new Error(`Invalid or duplicate media identity: ${entry.owner}:${entry.pathname}`)
  if (!/^[a-f0-9]{64}$/.test(entry.sha256) || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0) throw new Error(`Invalid media digest or size: ${entry.pathname}`)
  if (entry.mime !== null && !/^image\/(?:webp|png|jpeg)$/.test(entry.mime)) throw new Error(`Unsupported media MIME: ${entry.pathname}`)
  if (!entry.sourcePointer || !['unverified', 'verified'].includes(entry.rights)) throw new Error(`Invalid media provenance: ${entry.pathname}`)
  paths.add(`${entry.owner}:${entry.pathname}`)
}
const verified = document.entries.filter(entry => entry.rights === 'verified').length
console.log(`Validated ${document.entries.length} media entries; rightsVerified=${verified}; publishable=${verified === document.entries.length}`)
if (verified !== document.entries.length) process.exitCode = 2
