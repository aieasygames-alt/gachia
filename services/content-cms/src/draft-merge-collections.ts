import { APIError, type Access, type CollectionConfig, type Field, type PayloadRequest } from 'payload'
import { MAX_SNAPSHOT_BYTES } from './legacy-intake'
import { MERGE_FIELDS, mergeWriteToken, resolveMerge, reconsiderationToken, reconsideredPlan } from './draft-merge'
import { mergeProjection, prepareMerge, verifiedMerge } from './draft-merge-store'

const staff: Access = ({ req }) => Boolean(req.user && ['admin', 'reviewer', 'editor'].includes(req.user.role))
const reviewer: Access = ({ req }) => Boolean(req.user && ['admin', 'reviewer'].includes(req.user.role))
const readonlyText = (name: string): Field => ({ name, type: 'text', admin: { readOnly: true } })
const id = (value: unknown) => {
  const result = Number(value)
  if (!Number.isSafeInteger(result) || result < 1) throw new APIError('Invalid document identity.', 400)
  return result
}
async function guard(req: PayloadRequest, operation: string, roles: string[]) {
  if (operation !== 'create' || !req.user || !roles.includes(req.user.role)) throw new APIError('This append-only operation requires an authorized user.', 403)
  if (!(await req.transactionID)) throw new APIError('A real database transaction is required.', 503)
}

export function draftMergeCollections(): CollectionConfig[] {
  return [
    {
      slug: 'draft-merge-proposals', lockDocuments: false,
      admin: { group: 'Content review', useAsTitle: 'proposalKey', defaultColumns: ['draft', 'reviewItem', 'conflictCount', 'decisions', 'workflowEvents'], description: 'Prepare an immutable three-way comparison. Later draft edits invalidate it. Workflow Events can close stale proposals or explicitly reconsider closed/dismissed ones; every replacement requires fresh approval.' },
      access: { read: staff, create: staff, update: () => false, delete: () => false },
      fields: [
        { name: 'draft', type: 'relationship', relationTo: 'editorial-drafts', required: true },
        { name: 'reviewItem', type: 'relationship', relationTo: 'review-items', required: true },
        { name: 'proposalKey', type: 'text', unique: true, admin: { readOnly: true } },
        readonlyText('parentProposalKey'),
        readonlyText('sourceReviewKey'), readonlyText('targetReviewKey'), readonlyText('draftFingerprint'), readonlyText('actorID'), readonlyText('actorEmail'),
        { name: 'conflictCount', type: 'number', admin: { readOnly: true } },
        { name: 'comparison', type: 'array', admin: { readOnly: true }, fields: [readonlyText('field'), readonlyText('status'), readonlyText('suggested'), ...['baseText', 'currentText', 'incomingText'].map((name): Field => ({ name, type: 'textarea', maxLength: MAX_SNAPSHOT_BYTES, admin: { readOnly: true } }))] },
        { name: 'planText', type: 'textarea', maxLength: MAX_SNAPSHOT_BYTES, admin: { readOnly: true, hidden: true } },
        { name: 'decisions', type: 'join', collection: 'draft-merge-decisions', on: 'proposal', admin: { defaultColumns: ['action', 'actorEmail', 'createdAt'] } },
        { name: 'workflowEvents', type: 'join', collection: 'merge-workflow-events', on: 'proposal', admin: { defaultColumns: ['action', 'note', 'replacementKey', 'createdAt'] } },
      ],
      hooks: { beforeValidate: [async ({ req, operation, data }) => {
        await guard(req, operation, ['admin', 'reviewer', 'editor'])
        const draftID = id(data?.draft), reviewID = id(data?.reviewItem)
        if (data?.parentProposalKey && req.context.reconsideration !== reconsiderationToken) throw new APIError('Only the reconsideration workflow may create a retry.', 403)
        const prepared = await prepareMerge(req, draftID, reviewID)
        const plan = reconsideredPlan(prepared.plan, data?.parentProposalKey)
        if ((await req.payload.count({ collection: 'draft-merge-proposals', req, overrideAccess: true, where: { proposalKey: { equals: plan.proposalKey } } })).totalDocs) throw new APIError('This comparison already exists; use the existing proposal.', 409)
        return { draft: draftID, reviewItem: reviewID, parentProposalKey: plan.reconsideredFrom ?? null, ...mergeProjection(plan), actorID: String(req.user!.id), actorEmail: req.user!.email }
      }] },
    },
    {
      slug: 'draft-merge-decisions', lockDocuments: false,
      admin: { group: 'Content review', useAsTitle: 'proposalKey', defaultColumns: ['draft', 'action', 'actorEmail', 'createdAt'], description: 'Reviewer only. Apply preserves independent edits and requires one choice per conflict field. Dismiss leaves the source baseline and draft unchanged. Neither action publishes or removes hold.' },
      access: { read: staff, create: reviewer, update: () => false, delete: () => false },
      fields: [
        { name: 'proposal', type: 'relationship', relationTo: 'draft-merge-proposals', required: true, unique: true },
        { name: 'action', type: 'select', required: true, options: ['apply', 'dismiss'] },
        { name: 'note', type: 'textarea', required: true, minLength: 10, maxLength: 2000 },
        { name: 'choices', type: 'array', admin: { description: 'For apply: select each conflict field, then current (editor) or incoming (source). No choices are needed for non-conflicting fields. For dismiss: leave empty.' }, fields: [{ name: 'field', type: 'select', options: MERGE_FIELDS, required: true, admin: { components: { Field: '/src/components/ConflictField#ConflictField' } } }, { name: 'choice', type: 'select', options: ['current', 'incoming'], required: true }] },
        { name: 'proposalKey', type: 'text', unique: true, admin: { readOnly: true } },
        { name: 'draft', type: 'relationship', relationTo: 'editorial-drafts', admin: { readOnly: true } },
        readonlyText('sourceReviewKey'), readonlyText('targetReviewKey'), readonlyText('previousHead'), readonlyText('actorID'), readonlyText('actorEmail'),
      ],
      hooks: { beforeValidate: [async ({ req, operation, data }) => {
        await guard(req, operation, ['admin', 'reviewer'])
        if (!data || !['apply', 'dismiss'].includes(data.action) || typeof data.note !== 'string' || data.note.trim().length < 10 || data.note.length > 2000) throw new APIError('Choose an action and provide a substantive review note.', 400)
        const proposalID = id(data.proposal)
        const { draft, target, plan } = await verifiedMerge(req, proposalID, data.action)
        const choices = data.choices ?? []
        if (!Array.isArray(choices) || choices.some(row => !row || typeof row.field !== 'string' || !['current', 'incoming'].includes(row.choice))) throw new APIError('Invalid conflict choices.', 400)
        if (data.action === 'dismiss' && choices.length) throw new APIError('Dismiss must not contain conflict choices.', 400)
        if (data.action === 'apply') {
          let patch
          try { patch = resolveMerge(plan, draft, target.candidate!, choices) } catch (error) { throw new APIError((error as Error).message, 400) }
          await req.payload.update({ collection: 'editorial-drafts', id: draft.id, req, overrideAccess: false, overrideLock: false, context: { draftMerge: mergeWriteToken }, data: patch })
        }
        return { proposal: proposalID, action: data.action, note: data.note.trim(), choices: choices.map(({ field, choice }) => ({ field, choice })), proposalKey: plan.proposalKey, draft: draft.id, sourceReviewKey: plan.sourceReviewKey, targetReviewKey: plan.targetReviewKey, previousHead: draft.mergeHead ?? null, actorID: String(req.user!.id), actorEmail: req.user!.email }
      }] },
    },
  ]
}
