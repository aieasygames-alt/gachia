import { APIError, type Access, type CollectionConfig } from 'payload'
import { digest } from './legacy-intake'
import { verifiedGenshinCollectionItem } from './genshin-review-store'

const staff: Access = ({ req }) => Boolean(req.user && ['admin', 'reviewer', 'editor'].includes(req.user.role))
const reviewer: Access = ({ req }) => Boolean(req.user && ['admin', 'reviewer'].includes(req.user.role))
// These required values are assigned by the server hook. Hide them on create
// so the admin form does not reject empty read-only fields before the POST.
const computed = { readOnly: true, condition: (_data: unknown, _siblings: unknown, context: { operation?: string }) => context.operation !== 'create' }
export function genshinReviewCollections(): CollectionConfig[] {
  return [{
    slug: 'genshin-review-decisions', lockDocuments: false,
    admin: { group: 'Content review', useAsTitle: 'decisionKey', defaultColumns: ['reviewItem', 'action', 'actorEmail', 'createdAt'],
      description: 'Independent, append-only reviews for the complete Genshin collection. Inspect the genshin-review candidate comparison and choose its runKey. Accept permits a candidate export; it never publishes or clears content holds. Any CMS drift requires a new review.' },
    access: { read: staff, create: reviewer, update: () => false, delete: () => false },
    fields: [
      { name: 'runKey', type: 'text', required: true, index: true },
      { name: 'reviewItem', type: 'relationship', relationTo: 'migration-records', required: true,
        filterOptions: { family: { contains: 'collection-review/' } } },
      { name: 'action', type: 'select', required: true, options: ['accept-export', 'reject'] },
      { name: 'note', type: 'textarea', required: true, minLength: 10, maxLength: 2000 },
      { name: 'decisionKey', type: 'text', required: true, unique: true, admin: computed },
      ...['revisionKey', 'cmsKey', 'actorID', 'actorEmail'].map(name => ({ name, type: 'text' as const, required: true, admin: computed })),
    ],
    hooks: { beforeValidate: [async ({ data, req, operation }) => {
      if (operation !== 'create' || !req.user || !['admin', 'reviewer'].includes(req.user.role)) throw new APIError('Only reviewers may create collection decisions.', 403)
      if (!data || !['accept-export', 'reject'].includes(data.action) || typeof data.note !== 'string' || data.note.trim().length < 10 || data.note.length > 2000
        || typeof data.runKey !== 'string' || !/^[a-f0-9]{64}$/.test(data.runKey)) throw new APIError('Choose a pinned run, action and substantive review note.', 400)
      const id = Number(data.reviewItem)
      if (!Number.isSafeInteger(id) || id < 1) throw new APIError('Invalid review item.', 400)
      if (!(await req.transactionID)) throw new APIError('A real transaction is required.', 503)
      const { item, manifest } = await verifiedGenshinCollectionItem(req.payload, data.runKey, id, req)
      const decisionKey = digest(`${data.runKey}\0${item.revisionKey}`)
      const prior = await req.payload.count({ collection: 'genshin-review-decisions', req, overrideAccess: true, where: { decisionKey: { equals: decisionKey } } })
      if (prior.totalDocs) throw new APIError('This exact proposal already has a terminal decision.', 409)
      return { runKey: data.runKey, reviewItem: id, action: data.action, note: data.note.trim(), decisionKey,
        revisionKey: item.revisionKey, cmsKey: manifest.cmsKey, actorID: String(req.user.id), actorEmail: req.user.email }
    }] },
  }]
}
