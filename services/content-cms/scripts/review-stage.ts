import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { localEnvironment } from '../src/local-environment'
import { stageReview } from '../src/review-store'

const args = process.argv.slice(2)
const material = args[0] === '--materials-v2'
if (material) args.shift()
const [target, base, ...extra] = args
if (extra.length || !target || ![target, ...(base ? [base] : [])].every(value => /^[a-f0-9]{64}$/.test(value))) throw new Error('Usage: review:stage [--materials-v2] <target-complete-batch> [base-complete-batch]')
const local = localEnvironment()
if (process.env.CMS_LOCAL_NAMESPACE !== 'migration') throw new Error('Only the migration namespace is allowed')
const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
try {
  const result = await stageReview(payload, target, base, material ? 'review-v2-material' : 'review-v1')
  writeFileSync(path.join(local.directory, `review-${Date.now()}.json`), JSON.stringify(result, null, 2) + '\n')
  console.log(JSON.stringify(result))
} finally { await payload.destroy() }
