import assert from 'node:assert/strict'
import { AsyncLocalStorage } from 'node:async_hooks'
import path from 'node:path'

const chain = new AsyncLocalStorage<readonly string[]>()

// Content-addressed evidence still needs a bound on recursive ancestry reads.
// The context is private to this async call, never supplied in request JSON.
export function withUnifiedHistoryChain<T>(file: string, read: () => Promise<T>): Promise<T> {
  const parents = chain.getStore() ?? [], identity = path.resolve(file)
  assert(!parents.includes(identity), 'Cyclic publication history')
  assert(parents.length < 32, 'Publication history exceeds the 32-batch read budget')
  return chain.run([...parents, identity], read)
}
