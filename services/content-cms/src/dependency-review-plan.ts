import { canonical, type Candidate } from './record-mapping'
import { digest } from './legacy-intake'
import { materialDependencyPreview } from './material-public-preview'

type Identity = { id: string }
type Hint = { targetId: string; reason: 'case-or-separator' | 'guide-preposition' | 'qualified-character-id' }
function hints(missing: string, ids: string[], kind: 'material' | 'character'): Hint[] {
  const normalized = (id: string) => id.toLowerCase().replace(/[-_]/g, '')
  return ids.flatMap((targetId): Hint[] => {
    if (normalized(missing) === normalized(targetId)) return [{ targetId, reason: 'case-or-separator' }]
    if (kind === 'material' && missing.startsWith('guide-to-') && targetId === missing.replace(/^guide-to-/, 'guide-of-')) return [{ targetId, reason: 'guide-preposition' }]
    if (kind === 'character' && missing.length >= 4 && (targetId.endsWith(`-${missing}`) || targetId.startsWith(`${missing}-`))) return [{ targetId, reason: 'qualified-character-id' }]
    return []
  }).sort((a, b) => a.targetId.localeCompare(b.targetId))
}

// Suggestions describe lexical differences only, never equivalence or approval.
export function dependencyReviewPlan(game: string, candidates: Candidate[], relations: unknown, characters: unknown) {
  const graph = materialDependencyPreview(game, candidates, relations, characters)
  const materialIDs = graph.previews.map(p => p.dto.material.id)
  // The graph has already validated array shape, unique IDs and safe identities.
  const characterIDs = (characters as Identity[]).map(row => row.id)
  const relationRows = relations as { characterId: string }[]
  const sourcePath = `packages/data/games/${game}/raw-character-materials.json`
  const issues = (['material', 'character'] as const).flatMap(kind => {
    const missing = kind === 'material' ? graph.missingMaterials : graph.missingCharacters
    return missing.map(missingId => {
      const references = kind === 'material'
        ? graph.edges.filter(edge => edge.materialId === missingId).map(edge => ({ pointer: `${edge.sourcePointer}/id`, characterId: edge.characterId, quantity: edge.quantity }))
        : relationRows.flatMap((row, index) => row.characterId === missingId ? [{ pointer: `/${index}/characterId`, characterId: row.characterId, quantity: null }] : [])
      const candidateHints = hints(missingId, kind === 'material' ? materialIDs : characterIDs, kind)
      const identity = { dependencyKey: graph.previewKey, kind, missingId }
      return { issueKey: digest(canonical(identity)), ...identity, sourcePath, references, candidateHints,
        classification: candidateHints.length === 0 ? 'no-lexical-candidate' : candidateHints.length === 1 ? 'single-lexical-candidate' : 'ambiguous-lexical-candidates',
        status: 'needs-source-review', approvedTarget: null,
        requiredEvidence: ['authoritative-identity-and-game-version', 'all-reference-quantities-and-stages', 'url-and-consumer-impact'],
      }
    })
  })
  const data = { version: 'dependency-review-plan-v1', game, dependencyKey: graph.previewKey,
    characterIdentityResolutions: graph.characterIdentityResolutions,
    issues, counts: { issues: issues.length, references: issues.reduce((sum, issue) => sum + issue.references.length, 0),
      noCandidate: issues.filter(i => !i.candidateHints.length).length,
      singleCandidate: issues.filter(i => i.candidateHints.length === 1).length,
      ambiguous: issues.filter(i => i.candidateHints.length > 1).length },
    executable: false, publishable: false, sourceAuthority: 'legacy' }
  return { ...data, planKey: digest(canonical(data)) }
}

export function verifyDependencyReviewPlan(plan: ReturnType<typeof dependencyReviewPlan>, game: string, candidates: Candidate[], relations: unknown, characters: unknown) {
  const current = dependencyReviewPlan(game, candidates, relations, characters)
  if (canonical(plan) !== canonical(current)) throw new Error('Stale or altered dependency review plan; regenerate from current sources')
  return current
}
