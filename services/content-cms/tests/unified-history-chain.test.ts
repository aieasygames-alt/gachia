import assert from 'node:assert/strict'
import test from 'node:test'
import { withUnifiedHistoryChain } from '../src/unified-history-chain'

test('publication history rejects cycles before reopening the same production path', async () => {
  await assert.rejects(withUnifiedHistoryChain('/tmp/batch-a.json', async () =>
    withUnifiedHistoryChain('/tmp/batch-b.json', async () =>
      withUnifiedHistoryChain('/tmp/./batch-a.json', async () => 'unreachable'))), /Cyclic/)
})

test('publication history bounds recursive reads and recovers after failed traversal', async () => {
  const walk = async (depth: number, limit: number): Promise<number> => withUnifiedHistoryChain(`/tmp/batch-${depth}.json`, async () =>
    depth === limit ? depth : walk(depth + 1, limit))
  assert.equal(await walk(1, 32), 32)
  await assert.rejects(walk(1, 33), /32-batch/)
  assert.equal(await walk(1, 2), 2)
})

test('independent concurrent and repeated reads do not share ancestry state', async () => {
  const read = () => withUnifiedHistoryChain('/tmp/same.json', async () => { await Promise.resolve(); return 'read' })
  assert.deepEqual(await Promise.all([read(), read()]), ['read', 'read'])
  assert.equal(await read(), 'read')
})
