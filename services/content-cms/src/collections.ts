import type { Access, CollectionConfig } from 'payload'
import { APIError } from 'payload'
import path from 'node:path'
import { MAX_SNAPSHOT_BYTES } from './legacy-intake'
import { reviewCollections } from './review-collections'
import { draftMergeCollections } from './draft-merge-collections'
import { mergeWorkflowEvents } from './merge-workflow-events'
import { isDesktopNewGuide, validateDesktopNewGuideIdentity } from './desktop-new-guide'
import { assertJSON, isUnifiedRecord, validateUnifiedRecord } from './unified-content'
import { isDeepStrictEqual } from 'node:util'

const hasRole = (user: unknown, roles: string[]) => {
  if (!user || typeof user !== 'object' || !('role' in user)) return false
  return typeof user.role === 'string' && roles.includes(user.role)
}
const admin: Access = ({ req }) => hasRole(req.user, ['admin'])
const staff: Access = ({ req }) => hasRole(req.user, ['admin', 'editor', 'reviewer'])

export function collections(directory: string, options: { secureCookies?: boolean; postgres?: boolean } = {}): CollectionConfig[] {
  return [
    ...reviewCollections(options.postgres),
    ...draftMergeCollections(),
    mergeWorkflowEvents(),
    {
      slug: 'migration-records', lockDocuments: false,
      admin: { useAsTitle: 'stableKey', defaultColumns: ['gameKey', 'family', 'legacyId', 'mappingLevel'], description: 'Immutable migration candidates; not the editorial source or public content.' },
      access: { read: staff, create: () => false, update: () => false, delete: () => false },
      fields: [
        { name: 'stableKey', type: 'text', required: true, index: true },
        { name: 'revisionKey', type: 'text', required: true, unique: true, index: true },
        { name: 'gameKey', type: 'text', required: true, index: true },
        { name: 'family', type: 'text', required: true, index: true },
        { name: 'legacyId', type: 'text', required: true },
        { name: 'sourcePath', type: 'text', required: true },
        { name: 'mappingLevel', type: 'select', required: true, options: ['common-fields', 'identity-only', 'structured-fields'] },
        { name: 'hold', type: 'checkbox', required: true, defaultValue: true },
        { name: 'translations', type: 'array', fields: [
          { name: 'locale', type: 'select', required: true, options: ['zh', 'en', 'ja'] },
          { name: 'title', type: 'text' },
          { name: 'body', type: 'textarea', maxLength: MAX_SNAPSHOT_BYTES },
          { name: 'summary', type: 'textarea', maxLength: MAX_SNAPSHOT_BYTES },
        ] },
        { name: 'faqs', type: 'array', fields: [
          { name: 'locale', type: 'select', required: true, options: ['zh', 'en', 'ja'] },
          { name: 'sourcePointer', type: 'text', required: true },
          { name: 'question', type: 'textarea', maxLength: MAX_SNAPSHOT_BYTES },
          { name: 'answer', type: 'textarea', maxLength: MAX_SNAPSHOT_BYTES },
        ] },
        { name: 'assetReference', type: 'group', fields: [
          { name: 'category', type: 'text' },
          { name: 'legacyId', type: 'text' },
          { name: 'url', type: 'text' },
        ] },
        { name: 'rawRecord', type: 'textarea', required: true, maxLength: MAX_SNAPSHOT_BYTES },
        { name: 'reviewText', type: 'textarea', required: true, maxLength: MAX_SNAPSHOT_BYTES },
        { name: 'candidateText', type: 'textarea', required: true, maxLength: MAX_SNAPSHOT_BYTES },
      ],
    },
    {
      slug: 'migration-batches', lockDocuments: false,
      admin: { useAsTitle: 'batchKey', description: 'Complete candidate batch manifests; no active website pointer.' },
      access: { read: staff, create: () => false, update: () => false, delete: () => false },
      fields: [
        { name: 'batchKey', type: 'text', required: true, unique: true, index: true },
        { name: 'mapperVersion', type: 'text', required: true },
        { name: 'policyDigest', type: 'text', required: true },
        { name: 'recordCount', type: 'number', required: true },
        { name: 'manifest', type: 'textarea', required: true, maxLength: MAX_SNAPSHOT_BYTES },
      ],
    },
    {
      slug: 'migration-sources',
      admin: { useAsTitle: 'sourcePath', defaultColumns: ['sourcePath', 'gameKey', 'sourceKind'], description: 'Read-only legacy snapshots. These are not publishable content.' },
      lockDocuments: false,
      access: { read: staff, create: () => false, update: () => false, delete: () => false },
      fields: [
        { name: 'snapshotKey', type: 'text', required: true, unique: true, index: true },
        { name: 'gameKey', type: 'text', required: true, index: true },
        { name: 'sourcePath', type: 'text', required: true },
        { name: 'sourceDigest', type: 'text', required: true },
        { name: 'sourceKind', type: 'select', required: true, options: ['registry', 'raw-json', 'review-contract', 'inline-code'] },
        { name: 'rawText', type: 'textarea', required: true, maxLength: MAX_SNAPSHOT_BYTES },
      ],
    },
    {
      slug: 'users', auth: { tokenExpiration: 7200, maxLoginAttempts: 5, lockTime: 600000,
        cookies: { secure: options.secureCookies ?? false, sameSite: 'Lax' } },
      endpoints: [{ path: '/first-register', method: 'post', handler: () => Response.json({ error: 'Use the controlled administrator bootstrap CLI.' }, { status: 403 }) }],
      admin: { useAsTitle: 'email' },
      access: {
        create: admin, delete: admin,
        read: ({ req }) => hasRole(req.user, ['admin']) ? true : req.user ? { id: { equals: req.user.id } } : false,
        update: admin,
        admin: ({ req }) => hasRole(req.user, ['admin', 'editor', 'reviewer']),
      },
      fields: [{ name: 'role', type: 'select', required: true, defaultValue: 'editor', options: ['admin', 'editor', 'reviewer'], access: { create: ({ req }) => hasRole(req.user, ['admin']), update: ({ req }) => hasRole(req.user, ['admin']) } }],
    },
    {
      slug: 'games', admin: { useAsTitle: 'key' },
      access: { read: staff, create: admin, update: admin, delete: admin },
      fields: [
        { name: 'key', type: 'text', required: true, unique: true, index: true },
        { name: 'name', type: 'text', localized: true, required: true },
        { name: 'region', type: 'text', required: true },
        { name: 'legacyRegistry', type: 'json', required: true },
      ],
    },
    {
      slug: 'content-records', admin: { useAsTitle: 'stableKey', defaultColumns: ['game', 'kind', 'legacyId', 'hold', '_status'] },
      access: { read: staff, create: staff, update: staff, delete: admin },
      lockDocuments: { duration: 300 },
      versions: { drafts: true, maxPerDoc: 20 },
      hooks: {
        beforeDelete: [async ({ id, req }) => {
          const record = await req.payload.findByID({ collection: 'content-records', id, depth: 0, draft: true, req, overrideAccess: true })
          if (isUnifiedRecord(record)) throw new APIError('Unified content withdrawal requires an explicit publication contract.', 409)
        }],
        beforeOperation: [async ({ operation, args, req }) => {
          if (operation === 'update') {
            // A non-draft update can unpublish approved content without ever writing "published".
            if (args.draft !== true && !hasRole(req.user, ['admin', 'reviewer'])) {
              throw new APIError('Only a reviewer can update approved content or unpublish it. Save editorial changes with draft=true.', 403)
            }
            return { ...args, overrideLock: false }
          }
          if (operation === 'delete') return { ...args, overrideLock: false }
          if (operation !== 'restoreVersion') return args
          if (!hasRole(req.user, ['admin', 'reviewer'])) throw new APIError('Only a reviewer can restore editorial versions.', 403)
          // Payload restoreVersion has no overrideLock option. Check its parent before restoring.
          const version = await req.payload.findVersionByID({ collection: 'content-records', id: String(args.id), depth: 0, req, overrideAccess: false })
          const parent = version.parent
          const locks = await req.payload.find({ collection: 'payload-locked-documents', req, overrideAccess: false, depth: 0, limit: 1, sort: '-updatedAt', where: { and: [{ 'document.relationTo': { equals: 'content-records' } }, { 'document.value': { equals: parent } }] } })
          const lock = locks.docs[0]
          const owner = typeof lock?.user.value === 'object' ? lock.user.value.id : lock?.user.value
          if (lock && owner !== req.user?.id && Date.now() - new Date(lock.updatedAt).getTime() <= 300000) {
            throw new APIError('Content is locked by another editor.', 423)
          }
          return args
        }],
        beforeChange: [async ({ data, req, originalDoc, operation }) => {
          // Editorial publication is not authorization to activate a website release.
          if (data._status === 'published' && !hasRole(req.user, ['admin', 'reviewer'])) {
            throw new APIError('Only a reviewer can mark editorial content published.', 403)
          }
          const next = { ...originalDoc, ...data }
          if (isUnifiedRecord(next) || isUnifiedRecord(originalDoc)) {
            if (operation === 'create' && req.context.unifiedContentImport !== true) throw new APIError('Unified records must be created by the controlled source importer.', 403)
            try { validateUnifiedRecord(next, operation === 'create' ? undefined : originalDoc) }
            catch (error) { throw new APIError(error instanceof Error ? error.message : 'Invalid structured content', 400) }
            const gameId = typeof next.game === 'object' ? next.game?.id : next.game
            const game = await req.payload.findByID({ collection: 'games', id: gameId, depth: 0, req,
              overrideAccess: operation === 'create' && req.context.unifiedContentImport === true && !req.user })
            if (game.key !== next.sourceRecord.game) throw new APIError('Unified content game relationship mismatch.', 400)
            if (data.hold === false && originalDoc?.hold !== false && !hasRole(req.user, ['admin', 'reviewer'])) throw new APIError('Only a reviewer can clear a unified content hold.', 403)
            if (originalDoc && !isDeepStrictEqual(next.structuredValue, originalDoc.structuredValue) && data._status !== 'published') data.hold = true
          } else if (next.structuredValue != null) throw new APIError('Structured content requires immutable source provenance.', 400)
          if (isDesktopNewGuide(next) || (originalDoc && isDesktopNewGuide(originalDoc))) {
            let sourceGame: string
            try { sourceGame = validateDesktopNewGuideIdentity(next, operation === 'create' ? undefined : originalDoc) }
            catch { throw new APIError('New guide identity and source template must match the immutable game contract.', 400) }
            const gameId = typeof next.game === 'object' ? next.game?.id : next.game
            const game = await req.payload.findByID({ collection: 'games', id: gameId, depth: 0, req, overrideAccess: false })
            if (game.key !== sourceGame) throw new APIError('New guide game relationship mismatch.', 400)
          }
          return data
        }],
      },
      fields: [
        { name: 'stableKey', type: 'text', required: true, unique: true, index: true },
        { name: 'game', type: 'relationship', relationTo: 'games', required: true },
        { name: 'kind', type: 'text', required: true },
        { name: 'legacyId', type: 'text', required: true },
        { name: 'legacyPath', type: 'text', required: true },
        { name: 'title', type: 'text', localized: true, admin: { condition: data => !isUnifiedRecord(data) } },
        { name: 'body', type: 'textarea', localized: true, admin: { condition: data => !isUnifiedRecord(data) } },
        { name: 'bodyFormat', type: 'select', required: true, options: ['markdown', 'html', 'plain'], defaultValue: 'markdown', admin: { condition: data => !isUnifiedRecord(data) } },
        { name: 'sourceRecord', type: 'json', required: true, admin: { readOnly: true } },
        { name: 'structuredValue', type: 'json', label: 'Structured Content',
          // Payload's default JSON validator parses scalar strings as serialized JSON.
          // This field stores JSON values, including literal string blocks from data.ts.
          validate: value => {
            if (value === undefined) return true
            try { assertJSON(value); return true }
            catch (error) { return error instanceof Error ? error.message : 'Invalid JSON content' }
          },
          admin: { condition: data => isUnifiedRecord(data) } },
        { name: 'reviewEvidence', type: 'json' },
        { name: 'hold', type: 'checkbox', defaultValue: true },
      ],
    },
    {
      slug: 'media',
      access: { read: staff, create: staff, update: staff, delete: admin },
      upload: { staticDir: path.join(directory, 'media'), mimeTypes: ['image/png', 'image/jpeg', 'image/webp'], crop: false, focalPoint: false },
      fields: [{ name: 'alt', type: 'text', localized: true }],
    },
  ]
}
