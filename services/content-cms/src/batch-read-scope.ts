import type { Payload, PayloadRequest } from 'payload'
import type { RecordBatch } from './record-mapping'
import { loadRecordBatch } from './record-store'

export type BatchReader = (key: string) => Promise<RecordBatch>

// Owned by one operation in one transaction. Never cache decisions, drafts or locks.
export async function withBatchReads<T>(payload: Payload, req: Partial<PayloadRequest>, work: (read: BatchReader) => Promise<T>): Promise<T> {
  const transaction = await req.transactionID
  if (transaction == null) throw new Error('Batch read scope requires a transaction')
  const cache = new Map<string, Promise<RecordBatch>>()
  let open = true
  const read: BatchReader = async key => {
    if (!open || await req.transactionID !== transaction) throw new Error('Batch read scope expired or transaction changed')
    let pending = cache.get(key)
    if (!pending) {
      pending = loadRecordBatch(payload, key, req)
      cache.set(key, pending)
      pending.catch(() => { if (cache.get(key) === pending) cache.delete(key) })
    }
    const batch = await pending
    if (!open || await req.transactionID !== transaction) throw new Error('Batch read scope expired or transaction changed')
    // Callers may build projections, but cannot mutate the shared verified snapshot.
    return structuredClone(batch)
  }
  try { return await work(read) } finally { open = false; cache.clear() }
}
