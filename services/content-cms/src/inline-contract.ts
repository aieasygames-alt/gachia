export type InlineRule = { mode: 'rows' | 'section' | 'reader'; id?: string; family?: string; title?: string; body?: string; summary?: string; localized?: boolean; faq?: 'zh' }
const rows = (id = 'id', fields: Omit<InlineRule, 'mode' | 'id'> = {}): InlineRule => ({ mode: 'rows', id, ...fields })
const section: InlineRule = { mode: 'section' }
const reader: InlineRule = { mode: 'reader' }

// No heuristic IDs: unkeyed lists retain a symbol-scoped section until an editor assigns identities.
export const INLINE_CONTRACT: Record<string, Record<string, InlineRule>> = {
  lvmeng: {
    game: section, officialSources: section,
    playableCharacters: rows('slug', { family: 'characters', title: 'name', body: 'note' }),
    characterSources: section, patchSource: section, patchChecks: section, firstWeekRoute: section,
    clientEvidenceChecklist: section, contentStatus: section, sourcePolicy: section, launchPriority: section,
    launchDayVerification: rows('id', { title: 'title', summary: 'summary' }),
    contentRoadmap: section, releaseStatus: section, officialAnnouncements: section,
    previewFollowUpChecklist: section, officialEntryPoints: section,
    launchFaq: { mode: 'section', faq: 'zh' }, redeemCodeStatus: section,
    starterGuideSections: section, mapDirectory: section, progressionDirectory: section,
    versionHistory: section, systemOverview: section, preparationChecklist: section, launchRewards: section,
    deviceRequirements: section, launchSource: section, rewardsSource: section, worldGlossary: section,
    publicWorldSources: section, launchVerificationChecklist: section, communitySources: section,
  },
  genshin: { versionDecisionRoute: rows('id', { localized: true, title: 'title', summary: 'summary' }) },
  nte: {
    nteCharacterSummaries: reader, nteCharacters: reader, guides: reader, nteWeapons: reader,
    diskSets: reader, redeemCodes: reader, materials: reader, tierLists: reader, gacha: reader,
    anomalies: reader, regions: reader, characterBuilds: reader, characterMaterials: reader,
    versionCheckRoute: rows('id', { localized: true, title: 'title', summary: 'summary' }), downloadInfo: section,
  },
  'azur-promilia': {
    sourceStatusLabel: reader,
    travelTraceVerification: rows('id', { localized: true, title: 'label', summary: 'summary' }),
    kiboFacilities: rows('id', { localized: true, title: 'label' }),
    facilityReference: rows('id', { localized: true, title: 'label', body: 'description' }),
    kiboLifeSkills: rows('id', { localized: true, title: 'label' }),
    tuningMarkGlossary: rows('id', { localized: true, title: 'label', body: 'description' }),
    kiboLifecycle: rows('id', { localized: true, title: 'label', body: 'description' }),
    guides: rows('id', { family: 'guides', localized: true, title: 'title', body: 'content', summary: 'summary' }),
    redeemCodes: section,
    versionTimeline: rows('id', { localized: true, title: 'label', summary: 'changeSummary' }),
    kibo: rows('id', { localized: true, title: 'name', body: 'description' }),
    worldRegions: rows('id', { localized: true, title: 'name', body: 'description' }),
  },
}
