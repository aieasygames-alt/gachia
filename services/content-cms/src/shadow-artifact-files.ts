import { constants } from 'node:fs'
import { lstat, realpath, open, link, unlink } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { digest } from './legacy-intake'
import { canonical } from './record-mapping'
import type { ShadowArtifactReader } from './shadow-consumer'

type Kind = 'release' | 'snapshot'
const limits = { release: 1024 * 1024, snapshot: 2 * 1024 * 1024 }

// Local, private directory only: its parent must not be writable by untrusted users.
// This is not a sandbox against an attacker concurrently replacing ancestor directories.
export async function shadowArtifactFiles(root: string) {
  if (!path.isAbsolute(root) || path.normalize(root) !== root) throw new Error('Expected canonical absolute artifact root')
  const initial = await lstat(root)
  if (!initial.isDirectory() || initial.isSymbolicLink() || (initial.mode & 0o077) !== 0
    || initial.uid !== process.getuid?.() || await realpath(root) !== root) throw new Error('Unsafe artifact root')
  async function checkRoot() {
    const current = await lstat(root)
    if (!current.isDirectory() || current.dev !== initial.dev || current.ino !== initial.ino
      || (current.mode & 0o077) !== 0 || await realpath(root) !== root) throw new Error('Artifact root changed')
  }
  function filename(kind: Kind, key: string) {
    if (!Object.hasOwn(limits, kind) || !/^[a-f0-9]{64}$/.test(key)) throw new Error('Invalid artifact identity')
    return path.join(root, `${kind}-${key}.json`)
  }
  function verify(kind: Kind, key: string, text: string) {
    if (Buffer.byteLength(text) > limits[kind]) throw new Error('Oversized artifact')
    const value = JSON.parse(text)
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid artifact object')
    const field = `${kind}Key`
    const { [field]: identity, ...data } = value
    if (identity !== key || digest(canonical(data)) !== key) throw new Error('Artifact integrity failure')
    // Schema, route policy, capabilities, expiry and full closure are checked by the consumer.
  }
  const read: ShadowArtifactReader = async (kind, key) => {
    const target = filename(kind, key)
    await checkRoot()
    const file = await open(target, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK)
    try {
      const stat = await file.stat()
      if (!stat.isFile() || stat.nlink !== 1) throw new Error('Unsafe artifact file')
      if (stat.size > limits[kind]) throw new Error('Oversized artifact')
      // Never readFile(): growth after stat must not cause unbounded buffering.
      const buffer = Buffer.alloc(limits[kind] + 1)
      let size = 0
      while (size < buffer.length) {
        const result = await file.read(buffer, size, buffer.length - size, null)
        if (!result.bytesRead) break
        size += result.bytesRead
      }
      if (size > limits[kind]) throw new Error('Oversized artifact')
      const text = new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, size))
      verify(kind, key, text)
      await checkRoot()
      return text
    } finally { await file.close() }
  }
  async function write(kind: Kind, key: string, text: string) {
    const target = filename(kind, key)
    verify(kind, key, text)
    await checkRoot()
    const temporary = path.join(root, `.pending-${randomUUID()}`)
    const file = await open(temporary, 'wx', 0o600)
    try {
      await file.writeFile(text, 'utf8')
      await file.sync()
    } catch (error) {
      await unlink(temporary)
      throw error
    } finally { await file.close() }
    try {
      await checkRoot()
      // Hard-link commit is atomic and cannot replace an existing identity (unlike rename).
      await link(temporary, target)
    } finally { await unlink(temporary) }
    const directory = await open(root, constants.O_RDONLY | constants.O_NOFOLLOW)
    try { await directory.sync() } finally { await directory.close() }
  }
  return { read, write }
}
