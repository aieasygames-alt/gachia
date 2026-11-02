import type { TaskConfig } from 'payload'
import { digest } from './legacy-intake'

// Read-only local queue probe. It never fetches external sources or publishes content.
export const verifySourceTask: TaskConfig<{ input: { snapshotKey: string; expectedDigest: string }; output: { sourceDigest: string; sourceBytes: number } }> = {
  slug: 'verifySource',
  retries: { attempts: 1, backoff: { type: 'fixed', delay: 50 } },
  inputSchema: [{ name: 'snapshotKey', type: 'text', required: true }, { name: 'expectedDigest', type: 'text', required: true }],
  outputSchema: [{ name: 'sourceDigest', type: 'text', required: true }, { name: 'sourceBytes', type: 'number', required: true }],
  handler: async ({ input, req }) => {
    if (!/^[a-f0-9]{64}$/.test(input.snapshotKey) || !/^[a-f0-9]{64}$/.test(input.expectedDigest)) throw new Error('Invalid source verification input')
    const result = await req.payload.find({ collection: 'migration-sources', overrideAccess: true, req, limit: 1, where: { snapshotKey: { equals: input.snapshotKey } } })
    const source = result.docs[0]
    if (!source) throw new Error('Source unavailable; this is a failed check, not an unchanged source')
    if (source.sourceDigest !== input.expectedDigest || digest(source.rawText) !== input.expectedDigest) throw new Error('Source digest mismatch')
    return { output: { sourceDigest: source.sourceDigest, sourceBytes: Buffer.byteLength(source.rawText) } }
  },
}
