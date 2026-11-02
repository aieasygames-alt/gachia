import { randomUUID } from 'node:crypto'
import { APIError, type Access, type CollectionConfig, type Field } from 'payload'
import { digest, MAX_SNAPSHOT_BYTES } from './legacy-intake'
import { canonical } from './record-mapping'
import { verifiedReview, assertRevisionOpen } from './review-store'
import { mergeWriteToken } from './draft-merge'

import { materialFields, candidateMaterialCells, materialRaw } from './material-draft'

const staff: Access = ({ req }) => Boolean(req.user && ['admin', 'reviewer', 'editor'].includes(req.user.role))
const reviewer: Access = ({ req }) => Boolean(req.user && ['admin', 'reviewer'].includes(req.user.role))
const token = Object.freeze({})
const readOnly = { readOnly: true }
const text = (name: string, required = true): Field => ({ name, type: 'text', required, admin: readOnly })
const longText = (name: string): Field => ({ name, type: 'textarea', maxLength: MAX_SNAPSHOT_BYTES, admin: readOnly })
const immutableDraft = ['stableKey', 'gameKey', 'legacyId', 'kind', 'runKey', 'reviewKey', 'candidateRevision', 'sourcePath', 'unmappedFields', 'hold', 'state'] as const

export function reviewCollections(postgres = false): CollectionConfig[] {
  return [
    {
      slug: 'review-items', labels: { singular: 'Review item', plural: 'Review items' }, lockDocuments: false,
      admin: { group: 'Content review', useAsTitle: 'label', defaultColumns: ['gameKey', 'label', 'change', 'draftKind', 'decisions'], description: 'Read-only field comparison. Filter by runKey/gameKey/draftKind. Create a Review decision to accept as held draft or reject. Partial runs cannot be decided.' },
      access: { read: staff, create: () => false, update: () => false, delete: () => false },
      fields: [
        { name: 'reviewKey', type: 'text', unique: true, required: true }, text('label'), text('runKey'), text('gameKey'), text('stableKey'), text('sourcePath'), text('change'), text('draftKind'),
        text('beforeRevision', false), text('afterRevision', false), longText('blockers'), longText('warnings'),
        { name: 'fieldChanges', type: 'array', admin: readOnly, fields: [text('field'), longText('beforeText'), longText('afterText')] },
        { name: 'itemText', type: 'textarea', maxLength: MAX_SNAPSHOT_BYTES, admin: { readOnly: true, hidden: true } },
        { name: 'decisions', type: 'join', collection: 'review-decisions', on: 'reviewItem' },
        { name: 'mergeProposals', type: 'join', collection: 'draft-merge-proposals', on: 'reviewItem', admin: { defaultColumns: ['proposalKey', 'conflictCount', 'createdAt'] } },
      ],
    },
    {
      slug: 'review-runs', lockDocuments: false,
      admin: { group: 'Content review', useAsTitle: 'runKey', description: 'Complete review manifests only. This is not a publication or active content pointer.' },
      access: { read: staff, create: () => false, update: () => false, delete: () => false },
      fields: [{ name: 'runKey', type: 'text', unique: true, required: true }, text('baseBatch', false), text('targetBatch'), { name: 'itemCount', type: 'number', required: true }, longText('manifest')],
    },
    {
      slug: 'review-decisions', lockDocuments: false,
      admin: { group: 'Content review', useAsTitle: 'reviewKey', defaultColumns: ['reviewItem', 'action', 'actorEmail', 'draft', 'createdAt'], description: 'Reviewer-only, append-only decision. Accept creates a new held local draft, never publishes. Reject does not withdraw website content. Leave undecided to defer.' },
      access: { read: staff, create: reviewer, update: () => false, delete: () => false },
      fields: [
        { name: 'reviewItem', type: 'relationship', relationTo: 'review-items', required: true, unique: true },
        { name: 'action', type: 'select', options: ['accept-draft', 'reject'], required: true },
        { name: 'note', type: 'textarea', required: true, minLength: 10, maxLength: 2000 },
        { name: 'reviewKey', type: 'text', unique: true, admin: readOnly }, text('actorID', false), text('actorEmail', false),
        { name: 'draft', type: 'relationship', relationTo: 'editorial-drafts', admin: readOnly },
      ],
      hooks: {
        beforeValidate: [async ({ data, req, operation }) => {
          if (operation !== 'create' || !req.user || !['admin', 'reviewer'].includes(req.user.role)) throw new APIError('Only reviewers may create decisions.', 403)
          if (!data || !['accept-draft', 'reject'].includes(data.action) || typeof data.note !== 'string' || data.note.trim().length < 10 || data.note.length > 2000) throw new APIError('Choose an action and provide a substantive review note.', 400)
          const id = Number(data.reviewItem)
          if (!Number.isSafeInteger(id) || id < 1) throw new APIError('Invalid review item.', 400)
          if (!(await req.transactionID)) throw new APIError('A real database transaction is required.', 503)
          const { item, candidate, run } = await verifiedReview(req, id)
          const decided = await req.payload.count({ collection: 'review-decisions', req, overrideAccess: true, where: { reviewKey: { equals: item.reviewKey } } })
          if (decided.totalDocs) throw new APIError('This review item already has a terminal decision.', 409)
          await assertRevisionOpen(req, item, data.action)
          let draft: number | null = null
          if (data.action === 'accept-draft') {
            if (item.blockers.length || !item.draftKind || !candidate) throw new APIError('No supported draft path; review blockers first.', 409)
            const existing = await req.payload.count({ collection: 'editorial-drafts', req, overrideAccess: true, where: { stableKey: { equals: candidate.stableKey } } })
            if (existing.totalDocs) throw new APIError('A draft already exists. Automatic replacement of editorial work is forbidden.', 409)
            const created = await req.payload.create({ collection: 'editorial-drafts', req, overrideAccess: true, context: { draftIntake: token }, data: {
              stableKey: candidate.stableKey, gameKey: candidate.gameKey, legacyId: candidate.legacyId, kind: item.draftKind,
              runKey: run.runKey, reviewKey: item.reviewKey, candidateRevision: candidate.revisionKey, sourcePath: candidate.sourcePath,
              unmappedFields: canonical(candidate.unmappedFields), state: 'draft', hold: true, bodyFormat: 'unclassified',
              ...(item.draftKind === 'material' ? { materialFields: candidateMaterialCells(candidate) } : {}),
              translations: candidate.translations,
              faqs: (candidate.faqs ?? []).map(({ sourcePointer, ...faq }) => ({ ...faq, entryKey: digest(`${candidate.revisionKey}\0${sourcePointer}`) })),
              assetReference: candidate.assetReference ?? { category: null, legacyId: null, url: null },
            } })
            draft = created.id
          }
          return { reviewItem: id, action: data.action, note: data.note.trim(), reviewKey: item.reviewKey, actorID: String(req.user.id), actorEmail: req.user.email, draft }
        }],
      },
    },
    {
      slug: 'editorial-drafts',
      admin: { group: 'Content review', useAsTitle: 'stableKey', defaultColumns: ['gameKey', 'kind', 'stableKey', 'state', 'updatedAt'], description: 'Held local drafts only. Typed fields are editable; provenance and hold are fixed. Legacy stays authoritative. No publication or restore action is available.' },
      access: { read: staff, create: () => false, update: staff, delete: () => false, readVersions: staff },
      lockDocuments: { duration: 300 }, versions: { maxPerDoc: 30 },
      fields: [
        { name: 'stableKey', type: 'text', unique: true, required: true, admin: readOnly }, text('gameKey'), text('legacyId'),
        { name: 'kind', type: 'select', options: ['guide', 'character', 'faq-section', 'asset-reference', 'material'], required: true, admin: readOnly },
        { name: 'state', type: 'select', options: ['draft'], required: true, admin: readOnly },
        { name: 'hold', type: 'checkbox', required: true, admin: readOnly },
        text('runKey'), text('reviewKey'), text('candidateRevision'), text('sourcePath'), longText('unmappedFields'),
        text('sourceReviewKey', false), text('mergeHead', false),
        { name: 'mergeProposals', type: 'join', collection: 'draft-merge-proposals', on: 'draft', admin: { defaultColumns: ['proposalKey', 'conflictCount', 'createdAt'] } },
        { name: 'bodyFormat', type: 'select', required: true, options: ['unclassified', 'plain', 'markdown', 'html'], defaultValue: 'unclassified' },
        { name: 'translations', type: 'array', maxRows: 3, fields: [
          { name: 'locale', type: 'select', required: true, options: ['zh', 'en', 'ja'] },
          { name: 'title', type: 'text' }, { name: 'body', type: 'textarea', maxLength: MAX_SNAPSHOT_BYTES }, { name: 'summary', type: 'textarea', maxLength: MAX_SNAPSHOT_BYTES },
        ] },
        { name: 'faqs', type: 'array', fields: [
          { name: 'entryKey', type: 'text', required: true, defaultValue: () => randomUUID() },
          { name: 'locale', type: 'select', required: true, options: ['zh', 'en', 'ja'] },
          { name: 'question', type: 'textarea', maxLength: MAX_SNAPSHOT_BYTES }, { name: 'answer', type: 'textarea', maxLength: MAX_SNAPSHOT_BYTES },
        ] },
        { name: 'assetReference', type: 'group', fields: [{ name: 'category', type: 'text' }, { name: 'legacyId', type: 'text' }, { name: 'url', type: 'text' }] },
        // Keep existing SQLite table names; shorten new PostgreSQL version identifiers.
        postgres ? { ...materialFields, dbName: 'material_cells' } : materialFields,
        { name: 'editorNote', type: 'textarea', maxLength: 4000 },
      ],
      hooks: {
        beforeOperation: [({ operation, args }) => {
          if (operation === 'restoreVersion') throw new APIError('Restore requires a separate provenance-aware workflow.', 403)
          if (operation === 'update' || operation === 'delete') return { ...args, overrideLock: false }
          return args
        }],
        beforeChange: [({ data, originalDoc, operation, context }) => {
          if (operation === 'create' && context.draftIntake !== token) throw new APIError('Drafts can only be created by review intake.', 403)
          if (operation === 'update') for (const field of immutableDraft) if (data[field] !== undefined && canonical(data[field]) !== canonical(originalDoc[field])) throw new APIError(`Immutable draft provenance: ${field}`, 403)
          for (const field of ['sourceReviewKey', 'mergeHead']) if (data[field] !== undefined && canonical(data[field]) !== canonical(originalDoc?.[field]) && context.draftMerge !== mergeWriteToken) throw new APIError('Source head can only advance through a verified merge decision.', 403)
          if (data.hold === false || (data.state !== undefined && data.state !== 'draft')) throw new APIError('Drafts remain held and unpublished.', 403)
          const merged = { ...originalDoc, ...data }
          if (merged.kind === 'material') {
            try { materialRaw(merged.legacyId, merged.materialFields) }
            catch (error) { throw new APIError(`Invalid material fields: ${(error as Error).message}`, 400) }
            if (merged.translations?.length || merged.faqs?.length || merged.bodyFormat !== 'unclassified') throw new APIError('Materials use only typed material fields.', 400)
          } else if (merged.materialFields?.length) throw new APIError('Material fields require material kind.', 400)
          const locales = (merged.translations ?? []).map((item: { locale: string }) => item.locale)
          if (new Set(locales).size !== locales.length) throw new APIError('Duplicate translation locale.', 400)
          const faqKeys = (merged.faqs ?? []).map((item: { locale: string; entryKey: string }) => `${item.locale}:${item.entryKey}`)
          if (new Set(faqKeys).size !== faqKeys.length) throw new APIError('Duplicate FAQ locale/identity.', 400)
          if (merged.kind === 'asset-reference') {
            if (locales.length || faqKeys.length) throw new APIError('Asset references cannot contain article fields.', 400)
            const url = merged.assetReference?.url
            if (url) {
              let parsed: URL
              try { parsed = new URL(url) } catch { throw new APIError('Invalid asset URL.', 400) }
              if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new APIError('Invalid asset URL.', 400)
            }
          } else if (Object.values(merged.assetReference ?? {}).some(value => value != null && value !== '')) throw new APIError('Asset fields require the asset-reference kind.', 400)
          if (merged.kind === 'faq-section' && locales.length) throw new APIError('FAQ sections use typed FAQ fields.', 400)
          return data
        }],
      },
    },
  ]
}
