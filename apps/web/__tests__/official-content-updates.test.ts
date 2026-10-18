import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { OFFICIAL_CONTENT_UPDATES, getOfficialContentUpdates } from '@gachia/data/official-content-updates';
import { getVersionSnapshot } from '@/lib/version-snapshots';
import { getEndfieldGuideById } from '@gachia/data/games/endfield/guides';

describe('October 18 source-backed content update', () => {
  it('keeps source check, publication, region and content boundaries explicit in every language', () => {
    expect(new Set(OFFICIAL_CONTENT_UPDATES.map((entry) => entry.id)).size).toBe(OFFICIAL_CONTENT_UPDATES.length);
    for (const entry of OFFICIAL_CONTENT_UPDATES) {
      expect(entry.checkedAt).toBe('2026-10-18');
      if (entry.publishedAt) expect(entry.publishedAt <= entry.checkedAt).toBe(true);
      expect(entry.sources.length).toBeGreaterThan(0);
      for (const url of entry.sources) expect(new URL(url).protocol).toBe('https:');
      for (const locale of ['zh', 'en', 'ja'] as const) {
        for (const copy of [entry.region, entry.title, entry.boundary, ...entry.facts]) expect(copy[locale].trim()).not.toBe('');
      }
    }
  });

  it('does not invent a CN v9.1 release day or rewrite the Global archive as CN data', () => {
    const update = getOfficialContentUpdates('hi3')[0]!;
    expect(update.publishedAt).toBeUndefined();
    expect(getVersionSnapshot('hi3')).toMatchObject({ dateKind: 'verified', releaseDate: '2026-10-18' });
    expect(getVersionSnapshot('hi3')?.summary.en).toContain('Global v9.0');
    expect(update.boundary.zh).toContain('待完整官方公告');
  });

  it('preserves Endfield phased searches, server time and restricted compensation', () => {
    const entry = getOfficialContentUpdates('endfield')[0]!;
    expect(entry.facts[1]?.zh).toContain('11月5日12:00开始');
    expect(entry.facts[1]?.zh).toContain('服务器时间');
    expect(entry.facts[2]?.zh).toContain('更新前创建角色');
    expect(entry.facts[2]?.zh).toContain('下次版本维护时过期');
    expect(getEndfieldGuideById('danqingdu-cn-update-guide')?.content).toContain('不是所有新玩家均可领取');
    expect(getVersionSnapshot('endfield')?.status).toBe('live');
  });

  it('does not turn previews, reference posts, missing timezones or planned fixes into live claims', () => {
    expect(getOfficialContentUpdates('aniimo')[0]?.facts[1]?.zh).toContain('未注明时区');
    expect(getOfficialContentUpdates('aniimo')[0]?.boundary.zh).toContain('不把');
    expect(getOfficialContentUpdates('zzz')[0]?.boundary.zh).toContain('不等于3.3已上线');
    expect(getOfficialContentUpdates('nte')[0]?.boundary.zh).toContain('不能改写为已经修好');
    expect(getOfficialContentUpdates('wuwa')[0]?.boundary.zh).toContain('未据本轮核验确认3.8');
  });

  it('does not render an empty update panel for unaffected games', () => {
    expect(getOfficialContentUpdates('genshin')).toEqual([]);
    const component = readFileSync('components/wiki/official-updates.tsx', 'utf8');
    expect(component).toContain('if (!entries.length) return null');
    expect(component).toContain('dateTime={entry.checkedAt}');
    expect(component).toContain('dateTime={entry.publishedAt}');
    expect(component).toContain('href={url}');
  });

  it('keeps public JSON copies in parity with canonical guide data', () => {
    for (const game of ['endfield', 'aniimo', 'zzz', 'wuwa']) {
      const canonical = JSON.parse(readFileSync(`../../packages/data/games/${game}/raw-guides.json`, 'utf8'));
      const published = JSON.parse(readFileSync(`public/data/${game}/raw-guides.json`, 'utf8'));
      expect(published).toEqual(canonical);
    }
  });
});
