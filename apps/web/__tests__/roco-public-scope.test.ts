import { expect, it } from 'vitest';
import { ROCO_REVIEWED_ROUTES, ROCO_PUBLIC_REVIEW, ROCO_LIST_REVIEW, isRocoPublicPageUnderReview, rocoPublicReviewMetadata } from '@/lib/roco-public-review';
import { getTierListGroups } from '@/lib/game-data/tier-lists';
import sitemap from '@/app/sitemaps/main/sitemap';

it.each(['zh', 'en', 'ja'] as const)('does not fabricate default ranks or lose CN ratings in %s', async locale => {
  expect(await getTierListGroups('roco', locale)).toEqual([]);
  expect((await getTierListGroups('roco-cn', locale)).length).toBeGreaterThan(0);
  for (const route of ROCO_REVIEWED_ROUTES) {
    const meta = rocoPublicReviewMetadata(route, locale);
    expect(meta).toMatchObject({ robots: { index: false, follow: true }, description: ROCO_PUBLIC_REVIEW[route][locale].description });
    expect(meta.alternates.canonical).toBe(`https://gachia.com/${locale}/roco${route ? `/${route}` : ''}`);
    expect(meta.alternates).not.toHaveProperty('languages');
    expect(ROCO_PUBLIC_REVIEW[route][locale].checks).toHaveLength(3);
  }
});

it('uses a bounded route policy without suppressing all Roco or CN routes', async () => {
  expect(Object.keys(ROCO_PUBLIC_REVIEW).sort()).toEqual([...ROCO_REVIEWED_ROUTES].sort());
  for (const route of ROCO_REVIEWED_ROUTES) {
    expect(isRocoPublicPageUnderReview('roco', route)).toBe(true);
    expect(isRocoPublicPageUnderReview('roco-cn', route)).toBe(false);
  }
  expect(isRocoPublicPageUnderReview('roco', 'version')).toBe(false);
  expect(isRocoPublicPageUnderReview('wuwa', 'map')).toBe(false);
  const urls = new Set((await sitemap()).map(row => row.url));
  for (const locale of ['zh', 'en', 'ja']) {
    for (const route of ROCO_REVIEWED_ROUTES) expect(urls.has(`https://gachia.com/${locale}/roco${route ? `/${route}` : ''}`)).toBe(false);
    expect(urls.has(`https://gachia.com/${locale}/roco/version`)).toBe(true);
    expect(urls.has(`https://gachia.com/${locale}/roco-cn/tier-list`)).toBe(true);
  }
});

it.each(['zh', 'en', 'ja'] as const)('keeps list copy explicit about legacy entries and unfinished review in %s', locale => {
  for (const section of ['characters', 'guides'] as const) {
    const copy = ROCO_LIST_REVIEW[section][locale];
    expect(copy.title.length).toBeGreaterThan(10);
    expect(copy.description.length).toBeGreaterThan(40);
    expect(copy.notice.length).toBeGreaterThan(50);
    expect(copy.description).not.toMatch(/officially revealed|October playtest|10 月首测|公式公開済み/);
  }
});
