import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, unlink } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { writeDesktopCandidate } from '../src/desktop-candidate'

test('identical desktop exports reuse immutable files', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'desktop-candidate-'))
  try {
    const directory = path.join(root, 'candidate')
    await writeDesktopCandidate(directory, '[]\n', { releaseKey: 'test' })
    await writeDesktopCandidate(directory, '[]\n', { releaseKey: 'test' })
    assert.equal(await readFile(path.join(directory, 'raw-guides.json'), 'utf8'), '[]\n')
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('different candidate bytes or metadata cannot overwrite evidence', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'desktop-candidate-'))
  try {
    const directory = path.join(root, 'candidate')
    await writeDesktopCandidate(directory, '[]\n', { releaseKey: 'test' })
    await assert.rejects(writeDesktopCandidate(directory, '[1]\n', { releaseKey: 'test' }), /differs/)
    await assert.rejects(writeDesktopCandidate(directory, '[]\n', { releaseKey: 'changed' }), /differs/)
    assert.equal(await readFile(path.join(directory, 'raw-guides.json'), 'utf8'), '[]\n')
  } finally { await rm(root, { recursive: true, force: true }) }
})

test('incomplete candidate is rejected rather than silently repaired', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'desktop-candidate-'))
  try {
    const directory = path.join(root, 'candidate')
    await writeDesktopCandidate(directory, '[]\n', { releaseKey: 'test' })
    await unlink(path.join(directory, 'manifest.json'))
    await assert.rejects(writeDesktopCandidate(directory, '[]\n', { releaseKey: 'test' }), { code: 'ENOENT' })
    await assert.rejects(readFile(path.join(directory, 'manifest.json')), { code: 'ENOENT' })
  } finally { await rm(root, { recursive: true, force: true }) }
})
