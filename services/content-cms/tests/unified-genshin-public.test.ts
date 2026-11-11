import { execFileSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

test('Genshin public acceptance follows the real Router ownership, sitemap, assets and HTML cache contract', () => {
  execFileSync(process.execPath, ['--import', 'tsx', '--test', 'tests/fixtures/unified-genshin-public-router.mjs'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)), timeout: 120000, stdio: 'pipe',
  })
})
