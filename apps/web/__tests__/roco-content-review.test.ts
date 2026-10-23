import { expect, it } from 'vitest';
import { isContentUnderReview } from '@/lib/seo-metadata';
import { getCharacterListData, getCharacterMetaData } from '@/lib/game-data/characters';
import { getGuideListData } from '@/lib/game-data/guides';
import sitemap from '@/app/sitemaps/main/sitemap';
import characters from '../../../packages/data/games/roco/raw-characters.json';
import guides from '../../../packages/data/games/roco/raw-guides.json';

it('requires the explicit editorial marker rather than interpreting arbitrary source statuses as approval', () => {
  for (const input of [null, undefined, true, [], {}, { contentReview: null }, { contentReview: 'needs_verification' }, { contentReview: { status: 'verified' } }]) {
    expect(isContentUnderReview(input)).toBe(false);
  }
  expect(isContentUnderReview({ contentReview: { status: 'needs_verification' } })).toBe(true);
});

it.each(['zh', 'en', 'ja'] as const)('propagates editorial status through %s list and metadata adapters', async locale => {
  const list = await getCharacterListData('roco', locale);
  const guideList = await getGuideListData('roco', locale);
  for (const row of characters.filter(isContentUnderReview)) {
    const meta = await getCharacterMetaData('roco', row.id, locale);
    expect(isContentUnderReview(meta)).toBe(true);
    const card = list.find(entry => entry.id === row.id)!;
    expect(card.rarityLabel).toBeUndefined();
    expect(card.rankGroup).toBe('all');
    expect(card.elementLabel).toBe({ zh: '待核实', en: 'Unverified', ja: '未確認' }[locale]);
  }
  for (const row of guides.filter(isContentUnderReview)) {
    expect(guideList.guides.find(entry => entry.id === row.id)?.title).toBe(locale === 'zh' ? row.title : locale === 'ja' ? row.titleJa : row.titleEn);
  }
});

it('excludes reviewed details in every locale without globally dropping readable Roco pages', async () => {
  const urls = new Set((await sitemap()).map(row => row.url));
  for (const locale of ['zh', 'en', 'ja']) {
    for (const row of characters.filter(isContentUnderReview)) expect(urls.has(`https://gachia.com/${locale}/roco/characters/${row.id}`)).toBe(false);
    for (const row of guides.filter(isContentUnderReview)) expect(urls.has(`https://gachia.com/${locale}/roco/guides/${row.id}`)).toBe(false);
    expect(urls.has(`https://gachia.com/${locale}/roco/characters`)).toBe(true);
    expect(urls.has(`https://gachia.com/${locale}/roco/guides`)).toBe(true);
  }
  expect(urls.has('https://gachia.com/en/roco/guides/starter-guide')).toBe(false);
  expect(urls.has('https://gachia.com/en/roco/guides/global-player-feedback-roadmap-playbook')).toBe(true);
});
