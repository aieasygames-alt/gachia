import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { localEnvironment } from '../src/local-environment'
import { loadMaintenancePlan } from '../src/maintenance-store'

const [runKey, gameList, chunkArg, ...extra] = process.argv.slice(2)
if (!runKey || !/^[a-f0-9]{64}$/.test(runKey) || extra.length || (chunkArg && !/^\d+$/.test(chunkArg))) throw new Error('Usage: maintenance:plan <review-run-key> [game1,game2|all] [chunk-size:1..200]')
const local = localEnvironment()
if (process.env.CMS_LOCAL_NAMESPACE !== 'migration') throw new Error('Only the migration namespace is allowed')
const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
try {
  const plan = await loadMaintenancePlan(payload, runKey, { games: !gameList || gameList === 'all' ? undefined : gameList.split(','), chunkSize: chunkArg ? Number(chunkArg) : undefined })
  const file = path.join(local.directory, `maintenance-${plan.planKey}.json`)
  writeFileSync(file, JSON.stringify(plan, null, 2) + '\n')
  console.log(JSON.stringify({ file, planKey: plan.planKey, total: plan.total, counts: plan.counts, executable: false }))
} finally { await payload.destroy() }
