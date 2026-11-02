import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { localEnvironment } from '../src/local-environment'
import { loadRecordBatch } from '../src/record-store'
import { diffBatches } from '../src/record-mapping'

const [before, after, ...extra] = process.argv.slice(2)
if (extra.length || !before || !after || ![before, after].every(key => /^[a-f0-9]{64}$/.test(key))) throw new Error('Usage: records:diff <complete-before-batch-key> <complete-after-batch-key>')
const local = localEnvironment()
if (process.env.CMS_LOCAL_NAMESPACE !== 'migration') throw new Error('Only the migration namespace is allowed')
const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
try {
  const oldBatch = await loadRecordBatch(payload, before)
  const newBatch = await loadRecordBatch(payload, after)
  const diff = diffBatches(oldBatch, newBatch)
  writeFileSync(path.join(local.directory, `diff-${before}-${after}.json`), JSON.stringify({ before, after, ...diff }, null, 2) + '\n')
  console.log(JSON.stringify({ changes: diff.changes.length, automaticallyDeleted: 0, publishable: false }))
} finally { await payload.destroy() }
