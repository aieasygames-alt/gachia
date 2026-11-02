import { APIError, type Access, type CollectionConfig, type Field } from 'payload'
import { digest } from './legacy-intake'
import { canonical } from './record-mapping'
import { reconsiderationToken } from './draft-merge'
import { storedMerge } from './draft-merge-store'
import { proposalBlock } from './proposal-eligibility'

const staff: Access = ({ req }) => Boolean(req.user && ['admin', 'editor', 'reviewer'].includes(req.user.role))
const reviewer: Access = ({ req }) => Boolean(req.user && ['admin', 'reviewer'].includes(req.user.role))
const text = (name: string): Field => ({ name, type: 'text', admin: { readOnly: true } })

export function mergeWorkflowEvents(): CollectionConfig {
  return {
    slug: 'merge-workflow-events', lockDocuments: false,
    admin: { group: 'Content review', useAsTitle: 'eventKey', defaultColumns: ['action', 'note', 'sourceProposalKey', 'replacementKey', 'createdAt'], description: 'Append-only workflow history. Close an undecided proposal, even if stale. Reconsider a closed or dismissed proposal by creating a fresh comparison; never reverse an applied merge or edit an old decision.' },
    access: { read: staff, create: reviewer, update: () => false, delete: () => false },
    fields: [
      { name: 'proposal', type: 'relationship', relationTo: 'draft-merge-proposals', required: true },
      { name: 'action', type: 'select', options: ['close', 'reconsider'], required: true },
      { name: 'note', type: 'textarea', required: true, minLength: 10, maxLength: 2000 },
      { name: 'eventKey', type: 'text', unique: true, admin: { readOnly: true } },
      text('sourceProposalKey'), text('replacementKey'), text('actorID'), text('actorEmail'),
      { name: 'replacement', type: 'relationship', relationTo: 'draft-merge-proposals', admin: { readOnly: true } },
    ],
    hooks: {
      beforeDelete: [() => { throw new APIError('Workflow history cannot be deleted.', 403) }],
      beforeValidate: [async ({ req, data, operation }) => {
        if (operation !== 'create' || !req.user || !['admin', 'reviewer'].includes(req.user.role)) throw new APIError('Only reviewers may append workflow events.', 403)
        if (!(await req.transactionID)) throw new APIError('A real database transaction is required.', 503)
        if (!data || !['close', 'reconsider'].includes(data.action) || typeof data.note !== 'string' || data.note.trim().length < 10 || data.note.length > 2000) throw new APIError('Choose an action and provide a substantive reason.', 400)
        const id = Number(data.proposal)
        if (!Number.isSafeInteger(id) || id < 1) throw new APIError('Invalid proposal identity.', 400)
        const { proposal } = await storedMerge(req, id)
        const eventKey = digest(canonical({ proposalKey: proposal.proposalKey, action: data.action }))
        if ((await req.payload.count({ collection: 'merge-workflow-events', req, overrideAccess: true, where: { eventKey: { equals: eventKey } } })).totalDocs) throw new APIError('This workflow action already exists.', 409)
        const decision = (await req.payload.find({ collection: 'draft-merge-decisions', req, overrideAccess: true, depth: 0, where: { proposal: { equals: id } }, limit: 1 })).docs[0]
        const closed = await req.payload.count({ collection: 'merge-workflow-events', req, overrideAccess: true, where: { and: [{ proposal: { equals: id } }, { action: { equals: 'close' } }] } })
        const blocked = proposalBlock({ decision: decision?.action, closed: closed.totalDocs > 0, stale: false, conflicts: false }, data.action)
        if (blocked) throw new APIError(blocked, 409)
        let replacement: number | null = null, replacementKey: string | null = null
        if (data.action === 'reconsider') {
          const fresh = await req.payload.create({ collection: 'draft-merge-proposals', req, overrideAccess: false, context: { reconsideration: reconsiderationToken }, data: { draft: Number(proposal.draft), reviewItem: Number(proposal.reviewItem), parentProposalKey: proposal.proposalKey } })
          replacement = fresh.id; replacementKey = fresh.proposalKey!
        }
        return { proposal: id, action: data.action, note: data.note.trim(), eventKey, sourceProposalKey: proposal.proposalKey, replacement, replacementKey, actorID: String(req.user.id), actorEmail: req.user.email }
      }],
    },
  }
}
