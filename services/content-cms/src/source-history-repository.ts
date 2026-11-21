import assert from 'node:assert/strict'
import { AsyncLocalStorage } from 'node:async_hooks'
import { execFileSync } from 'node:child_process'
import { realpathSync } from 'node:fs'
import path from 'node:path'
import { projectRoot } from './local-environment'

const repositoryScope = new AsyncLocalStorage<string>()
const defaultRepository = path.resolve(projectRoot, '../..')

// Installed maintenance executors keep their code in a sealed release, while
// historical Git objects and absolute checkpoint contracts stay in the repository.
// Scope only the read operation; do not change process-wide environment or cwd.
export const sourceHistoryRepository = () => repositoryScope.getStore() ?? defaultRepository

export function withSourceHistoryRepository<T>(repository: string, read: () => T): T {
  assert(path.isAbsolute(repository), 'Source-history repository must be absolute')
  const actual = realpathSync(repository)
  const top = execFileSync('git', ['--no-replace-objects', 'rev-parse', '--show-toplevel'],
    { cwd: actual, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  assert.equal(realpathSync(top), actual, 'Source-history repository must be a Git root')
  return repositoryScope.run(actual, read)
}
