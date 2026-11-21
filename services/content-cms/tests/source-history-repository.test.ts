import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, realpathSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { sourceHistoryRepository, withSourceHistoryRepository } from '../src/source-history-repository'

test('installed history readers retain their repository across awaits without leaking to concurrent readers', async () => {
  const temporary = mkdtempSync(path.join(tmpdir(), 'gachia-history-root-'))
  const original = sourceHistoryRepository()
  try {
    const repositories = ['first', 'second'].map(name => {
      const directory = path.join(temporary, name)
      mkdirSync(directory)
      execFileSync('git', ['init', '--quiet', directory])
      return realpathSync(directory)
    })
    await Promise.all(repositories.map(repository => withSourceHistoryRepository(repository, async () => {
      assert.equal(sourceHistoryRepository(), repository)
      await new Promise(resolve => setImmediate(resolve))
      assert.equal(sourceHistoryRepository(), repository)
    })))
    assert.equal(sourceHistoryRepository(), original)
    assert.throws(() => withSourceHistoryRepository(repositories[0], () => { throw Error('read failed') }), /read failed/)
    assert.equal(sourceHistoryRepository(), original)
    const child = path.join(repositories[0], 'nested'); mkdirSync(child)
    assert.throws(() => withSourceHistoryRepository(child, () => {}), /must be a Git root/)
    assert.throws(() => withSourceHistoryRepository('relative', () => {}), /must be absolute/)
    assert.throws(() => withSourceHistoryRepository(temporary, () => {}))
    assert.equal(sourceHistoryRepository(), original)
  } finally { rmSync(temporary, { recursive: true, force: true }) }
})
