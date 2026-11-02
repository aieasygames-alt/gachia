import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { localEnvironment } from '../src/local-environment'
import { loadRecordBatch } from '../src/record-store'
import { contractCoverage } from '../src/contract-coverage'

const [batchKey, ...extra] = process.argv.slice(2)
if (extra.length || !batchKey || !/^[a-f0-9]{64}$/.test(batchKey)) throw new Error('Usage: contracts:coverage <complete-batch-key>')
const local = localEnvironment()
if (process.env.CMS_LOCAL_NAMESPACE !== 'migration') throw new Error('Only the migration namespace is allowed')
const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
try {
  const transactionID = await payload.db.beginTransaction()
  if (!transactionID) throw new Error('Coverage requires a transaction')
  let report
  try {
    report = contractCoverage(await loadRecordBatch(payload, batchKey, { transactionID }))
    await payload.db.commitTransaction(transactionID)
  } catch (error) { await payload.db.rollbackTransaction(transactionID); throw error }
  const file = path.join(local.directory, `contracts-${report.coverageKey}.json`)
  writeFileSync(file, JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify({ file, total: report.total, counts: report.counts, draftPolicyChanged: false }))
} finally { await payload.destroy() }
