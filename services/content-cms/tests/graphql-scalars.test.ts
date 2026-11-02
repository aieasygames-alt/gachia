import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import test from 'node:test'

test('Payload scalar override preserves used exports and rejects adversarial phone input promptly', () => {
  const require = createRequire(import.meta.url)
  const nextRequire = createRequire(require.resolve('@payloadcms/next/routes'))
  const graphRequire = createRequire(nextRequire.resolve('@payloadcms/graphql'))
  const scalar = graphRequire.resolve('graphql-scalars')
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    import { createRequire } from 'node:module';
    const { DateTimeResolver, EmailAddressResolver, PhoneNumberResolver } = createRequire(import.meta.url)(${JSON.stringify(scalar)});
    assert.equal(DateTimeResolver.serialize(new Date('2026-10-29T00:00:00.000Z')).toISOString(), '2026-10-29T00:00:00.000Z');
    assert.equal(EmailAddressResolver.parseValue('editor@example.invalid'), 'editor@example.invalid');
    assert.throws(() => EmailAddressResolver.parseValue('invalid'));
    assert.throws(() => PhoneNumberResolver.parseValue('1'.repeat(40) + 'x'));
  `], { encoding: 'utf8', timeout: 5000 })
  assert.equal(result.status, 0, result.stderr || result.error?.message)
})
