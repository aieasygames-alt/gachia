import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { genshinMetadata } from '../../game-genshin/lib/seo';
import { characterImage } from '../../game-nte/lib/character-media';

const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('Genshin public backlog', () => {
  for (const locale of ['zh', 'en', 'ja'] as const) {
    it(`gives the distinct ${locale} wish-planning page its own metadata and alternates`, () => {
      const metadata = genshinMetadata(locale, 'gacha', 'Wish planning', 'Plan before pulling');
      expect(metadata.title).toBe('Wish planning');
      expect(metadata.description).toBe('Plan before pulling');
      expect(metadata.alternates?.canonical).toBe(`https://gachia.com/${locale}/genshin/gacha`);
      expect(metadata.alternates?.languages).toEqual({ 'zh-Hans': 'https://gachia.com/zh/genshin/gacha', en: 'https://gachia.com/en/genshin/gacha', ja: 'https://gachia.com/ja/genshin/gacha', 'x-default': 'https://gachia.com/zh/genshin/gacha' });
    });
  }
  it('corrects weapon wording without changing unrelated locale exceptions', () => {
    expect(genshinMetadata('en', 'weapons', '', '').title).toContain('Stats, Effects & Sources');
    expect(genshinMetadata('zh', 'redeem-codes', '', '').alternates?.languages).toBeUndefined();
    expect(genshinMetadata('ja', 'guides/banner-schedule-guide', '', '').alternates?.languages).not.toHaveProperty('ja');
  });
  it('restores calculator navigation and removes obsolete account-service promises in all locales', () => {
    expect(source('../../game-genshin/app/[lang]/genshin/calculator/page.tsx')).toContain('<GameNav locale={locale} current="calculator"/>');
    const home = source('../../game-genshin/app/[lang]/genshin/page.tsx');
    for (const stale of ['仍由主域', 'remain handled by main-domain', '引き続き主ドメイン', '主ドメイン API が処理']) expect(home).not.toContain(stale);
    for (const notice of ['云端同步目前停用', 'cloud sync are currently disabled', 'クラウド同期は現在停止中']) expect(home).toContain(notice);
    expect(source('../../game-genshin/app/sitemap.ts')).toContain("'gacha'");
  });
});

describe('NTE verified portrait policy', () => {
  it('does not invent artwork or request the known missing portrait', () => {
    expect(characterImage({ id: 'chaos' })).toBeNull();
    expect(characterImage({ id: 'nanally' })).toBe('/images/characters/nanally.webp');
    const summaries = JSON.parse(source('../../../packages/data/games/nte/raw-character-summaries.json')) as { id: string }[];
    const missing = summaries.filter((row) => {
      const image = characterImage(row);
      return image && !existsSync(new URL(`../public${image}`, import.meta.url));
    });
    expect(missing).toEqual([]);
    expect(summaries.filter((row) => characterImage(row) === null).map((row) => row.id)).toEqual(['chaos']);
  });
  it('uses the same explicit placeholder component in detail and featured cards', () => {
    for (const path of ['page.tsx', 'characters/[id]/page.tsx']) {
      const page = source(`../../game-nte/app/[lang]/nte/${path}`);
      expect(page).toContain('<CharacterPortrait');
      expect(page).not.toContain('src={characterImage(');
    }
    const portrait = source('../../game-nte/components/character-portrait.tsx');
    expect(portrait).toContain('data-portrait-unavailable={id}');
    expect(portrait).toContain('暂无经核验的角色肖像');
    expect(portrait).toContain('No verified character portrait available');
    expect(portrait).toContain('確認済みのキャラクター画像はありません');
    const css = source('../../game-nte/app/globals.css');
    expect(css).toContain('img.detail-image:not([src])');
    expect(css).not.toMatch(/(?:^|\n)\.detail-image:not\(\[src\]\)/);
  });
});
