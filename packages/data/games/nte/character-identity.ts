/**
 * Explicit identity policy for NTE characters whose CMS dependency identity
 * is different from the page identities. This is deliberately an allow-list:
 * no fuzzy matching or gender preference is permitted here.
 */
export const NTE_CHARACTER_IDENTITY_POLICY_VERSION = 'nte-character-identity-v1' as const;

export const NTE_CANONICAL_CHARACTER_IDENTITIES = {
  zero: {
    canonicalId: 'zero',
    displayVariantIds: ['zero-male', 'zero-female'],
    resolution: 'approved-canonical-identity' as const,
    evidence: {
      sourcePath: 'reports/material-type-expansion-2026-11-16-r125/source-evidence/nte-source-evidence.json',
      sourceSha256: '3c1396c5facac9dc1f7c2229b79ebea695a3a17fe4fbc437626d8391bd970992',
      sourceId: 'official-nte-role-page',
      supportingSourceIds: ['game8-appraiser-gender-switch'],
      canonicalIdentityConfirmed: true,
      relationSchemaConfirmed: false,
      materialDependencyConfirmed: false,
    },
  },
} as const;

type CanonicalIdentity = (typeof NTE_CANONICAL_CHARACTER_IDENTITIES)[keyof typeof NTE_CANONICAL_CHARACTER_IDENTITIES];

export type NteCharacterIdentityResolution = {
  sourceId: string;
  canonicalId: string;
  displayVariantIds: string[];
  resolution: 'approved-canonical-identity' | 'display-variant' | 'direct-character-id';
  evidence?: CanonicalIdentity['evidence'];
};

const variantToCanonical = new Map<string, CanonicalIdentity>(
  Object.values(NTE_CANONICAL_CHARACTER_IDENTITIES).flatMap(identity =>
    identity.displayVariantIds.map(variantId => [variantId, identity] as const),
  ),
);

/**
 * Resolve one NTE dependency reference against the page identities in the
 * current source. A canonical relation is valid only when every explicitly
 * approved display variant exists. Unknown IDs remain unresolved.
 */
export function resolveNteCharacterReference(
  sourceId: string,
  availableCharacterIds: Iterable<string>,
): NteCharacterIdentityResolution | null {
  const available = new Set(availableCharacterIds);
  const canonical = NTE_CANONICAL_CHARACTER_IDENTITIES[sourceId as keyof typeof NTE_CANONICAL_CHARACTER_IDENTITIES];
  if (canonical) {
    const missingVariants = canonical.displayVariantIds.filter(id => !available.has(id));
    if (missingVariants.length) {
      throw new Error(`NTE canonical character ${sourceId} is missing display variants: ${missingVariants.join(', ')}`);
    }
    return {
      sourceId,
      canonicalId: canonical.canonicalId,
      displayVariantIds: [...canonical.displayVariantIds],
      resolution: canonical.resolution,
      evidence: canonical.evidence,
    };
  }

  const variant = variantToCanonical.get(sourceId);
  if (variant) {
    if (!available.has(sourceId)) return null;
    return {
      sourceId,
      canonicalId: variant.canonicalId,
      displayVariantIds: [sourceId],
      resolution: 'display-variant',
      evidence: variant.evidence,
    };
  }

  if (!available.has(sourceId)) return null;
  return { sourceId, canonicalId: sourceId, displayVariantIds: [sourceId], resolution: 'direct-character-id' };
}

/**
 * Material rows are keyed by the canonical relation ID. Both Zero page
 * variants therefore read the same held relation without inventing a second
 * copy of its stages or quantities.
 */
export function nteCharacterMaterialRelationId(characterId: string): string {
  return variantToCanonical.get(characterId)?.canonicalId ?? characterId;
}

/** Return page IDs for a consumer that needs links instead of a CMS relation. */
export function nteCharacterDisplayIds(characterId: string): string[] {
  const canonical = NTE_CANONICAL_CHARACTER_IDENTITIES[characterId as keyof typeof NTE_CANONICAL_CHARACTER_IDENTITIES];
  return canonical ? [...canonical.displayVariantIds] : [characterId];
}

