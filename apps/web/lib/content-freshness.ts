export type FreshnessSeverity = 'risk' | 'archive';
export type FreshnessScope = 'current-entry' | 'raw-guide';

export type FreshnessWatchTerm = {
  term: string;
  games: string[];
  currentRoute: string;
};

export type FreshnessGuide = {
  id: string;
  title?: string;
  titleEn?: string;
  summary?: string;
  summaryEn?: string;
  currentVersion?: string;
  content?: string;
  contentEn?: string;
};

export type FreshnessFinding = {
  scope: FreshnessScope;
  severity: FreshnessSeverity;
  gameId: string;
  id: string;
  term: string;
  currentRoute: string;
  file: string;
};

export type FreshnessSummary = {
  total: number;
  risk: number;
  archive: number;
  byScope: Partial<Record<FreshnessScope, number>>;
};

export const FRESHNESS_WATCH_TERMS: FreshnessWatchTerm[] = [
  { term: 'v3.1', games: ['zzz'], currentRoute: 'v3.3 watch / v3.2 recap' },
  { term: '3.1 当前', games: ['zzz'], currentRoute: 'v3.3 watch / v3.2 recap' },
  { term: 'v3.0', games: ['zzz'], currentRoute: 'v3.3 watch / v3.2 recap' },
  { term: 'v4.4', games: ['starrail'], currentRoute: 'v4.6 preview / live warps' },
  { term: '4.4 当前', games: ['starrail'], currentRoute: 'v4.6 preview / live warps' },
  { term: 'Homecoming', games: ['endfield'], currentRoute: 'CN Danqingdu / historical test archive' },
  { term: '7 月 23', games: ['sea'], currentRoute: 'early 2027 / December beta watch' },
  { term: 'July 23', games: ['sea'], currentRoute: 'early 2027 / December beta watch' },
  { term: '移动端首发', games: ['sea'], currentRoute: 'early 2027 / December beta watch' },
  { term: 'Mobile launch', games: ['sea'], currentRoute: 'early 2027 / December beta watch' },
  { term: '上线前', games: ['aniimo'], currentRoute: 'S1 live / October 16 weekly update' },
  { term: 'pre-launch', games: ['aniimo'], currentRoute: 'S1 live / October 16 weekly update' },
];

export const FRESHNESS_CURRENT_ENTRY_TERMS = FRESHNESS_WATCH_TERMS.filter((rule) => !['上线前', 'pre-launch'].includes(rule.term));

export const FRESHNESS_ARCHIVE_GUIDE_IDS: Record<string, Set<string>> = {
  starrail: new Set([
    'v4-4-preview-guide',
    'v4-3-version-guide',
    'fate-collab-guide',
    'banner-schedule-guide',
    'farming-route-guide',
    'himeko-nova-fate-pull-plan',
    'fate-rin-gilgamesh-reward-faq',
  ]),
  zzz: new Set([
    'steam-3-0-start-guide',
    'banner-schedule-guide',
    'team-building-guide',
    'w-engine-guide',
    'drive-disc-guide',
    'build-jane-doe',
    'farming-route-guide',
    'v3-0-version-guide',
    'meta-teams-v3-guide',
    'v3-1-anniversary-xbox-guide',
    'anniversary-rewards-codes-plan',
    'v3-1-remielle-sigrid-pull-plan',
  ]),
  endfield: new Set([
    'homecoming-operators-map-route',
    'official-download-specs-homecoming-faq',
    'steam-pioneer-test-registration-faq',
  ]),
  sea: new Set([
    'official-2026-test-timeline-guide',
    'launch-day-guide',
    'open-beta-version-center',
    'download-install-guide',
    'launch-preview-calendar',
    'launch-rewards-codes-guide',
    'launch-30min-checklist',
    'platform-download-guide',
    'launch-day-vs-ashfall',
    'launch-week-overview',
    'mobile-launch-guide',
    'week-one-live-ops-overview',
    'mobile-troubleshooting-guide',
    'pc-mobile-cross-progression-faq',
    'molly-starter-team-guide',
    'n3-abyss-week-one-route',
    'system-requirements-guide',
    'ps5-release-guide',
    'ps5-xbox-review-gameplay-faq',
    'gamescom-demo-gameplay-review-faq',
    'identity-v-mobile-launch-event-guide',
    'spongebob-collab-summer-faq',
    'haizang-combat-highlight-guide',
    'bluewave-band-music-character-guide',
    'offline-seafood-stall-event-guide',
    'channel-rewards-code-verification-guide',
    'mobile-graphics-fps-heat-settings-guide',
    'heige-haizang-double-intellect-team-guide',
    'today-live-events-calendar-guide',
    'guide-freshness-toxic-advice-checklist',
    'lost-sea-act-two-july-30-prep-guide',
    'identity-v-signin-screenshot-rewards-guide',
  ]),
};

export function guideHasArchiveMarker(guide: FreshnessGuide) {
  const blob = [
    guide.summary,
    guide.summaryEn,
    guide.currentVersion,
    guide.content,
    guide.contentEn,
  ].filter(Boolean).join('\n');

  return /历史归档|Archive note|historical|archive/i.test(blob);
}

export function isKnownFreshnessArchive(gameId: string, guide: FreshnessGuide) {
  if (FRESHNESS_ARCHIVE_GUIDE_IDS[gameId]?.has(guide.id)) return true;
  const blob = [guide.title, guide.titleEn, guide.summary, guide.summaryEn, guide.currentVersion]
    .filter(Boolean)
    .join('\n');
  return /历史|归档|archive|historical|recap/i.test(blob);
}

export function scanFreshnessGuides(gameId: string, guides: readonly FreshnessGuide[], file: string): FreshnessFinding[] {
  const findings: FreshnessFinding[] = [];
  const rules = FRESHNESS_WATCH_TERMS.filter((item) => item.games.includes(gameId));

  for (const guide of guides) {
    const text = [
      guide.title,
      guide.titleEn,
      guide.summary,
      guide.summaryEn,
      guide.currentVersion,
      guide.content,
      guide.contentEn,
    ].filter(Boolean).join('\n');

    for (const rule of rules) {
      if (!text.includes(rule.term)) continue;

      findings.push({
        scope: 'raw-guide',
        severity: guideHasArchiveMarker(guide) || isKnownFreshnessArchive(gameId, guide) ? 'archive' : 'risk',
        gameId,
        id: guide.id,
        term: rule.term,
        currentRoute: rule.currentRoute,
        file,
      });
    }
  }

  return findings;
}

export function scanFreshnessEntryFile(file: string, text: string): FreshnessFinding[] {
  const legacy: FreshnessFinding[] = FRESHNESS_CURRENT_ENTRY_TERMS
    .filter((rule) => text.includes(rule.term))
    .map((rule) => ({
      scope: 'current-entry',
      severity: 'risk',
      gameId: rule.games.join(','),
      id: '',
      term: rule.term,
      currentRoute: rule.currentRoute,
      file,
    }));
  // Narrow, source-backed transition rules supplement the legacy keyword scan.
  // These rules flag current entry copy, not historical guide archives.
  const transitions = [
    { gameId: 'lvmeng', pattern: /(?:预计|显示预计)[^\n]{0,30}2026\s*年?\s*10\s*月\s*31\s*日/, route: '1.0 public beta live since 2026-10-15' },
    { gameId: 'lvmeng', pattern: /id:\s*'lvmeng',\s*status:\s*'upcoming'/, route: 'live' },
    { gameId: 'azur-promilia', pattern: /id:\s*'azur-promilia',\s*status:\s*'test'/, route: 'post-test since 2026-10-07' },
    { gameId: 'zzz', pattern: /3\.3[^\n]{0,80}(?:将于|将在)[^\n]{0,40}10\s*月\s*9\s*日/, route: 'preview recap; program codes expired 2026-10-11' },
  ];
  return [...legacy, ...transitions.flatMap((rule): FreshnessFinding[] => {
    const match = text.match(rule.pattern);
    return match ? [{ scope: 'current-entry', severity: 'risk', gameId: rule.gameId, id: '', term: match[0], currentRoute: rule.route, file }] : [];
  })];
}

export function summarizeFreshnessFindings(findings: readonly FreshnessFinding[]): FreshnessSummary {
  const summary: FreshnessSummary = {
    total: findings.length,
    risk: findings.filter((item) => item.severity === 'risk').length,
    archive: findings.filter((item) => item.severity === 'archive').length,
    byScope: {},
  };

  for (const finding of findings) {
    summary.byScope[finding.scope] = (summary.byScope[finding.scope] ?? 0) + 1;
  }

  return summary;
}
