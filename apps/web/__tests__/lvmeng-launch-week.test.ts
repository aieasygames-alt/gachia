import { describe, expect, it } from 'vitest';
import {
  characterSources, clientEvidenceChecklist, contentStatus, firstWeekRoute,
  launchDayVerification, launchRewards, mapDirectory, officialAnnouncements,
  patchChecks, playableCharacters, redeemCodeStatus, versionHistory,
} from '../../game-lvmeng/lib/data';

describe('Lvmeng launch-week content', () => {
  it('adds dated official hotfixes without claiming client verification', () => {
    expect(contentStatus).toMatchObject({ verifiedAt: '2026-10-18', clientVerified: false });
    expect(officialAnnouncements.slice(0, 2).map((entry) => entry.date)).toEqual(['2026-10-17', '2026-10-16']);
    expect(versionHistory[0]?.date).toBe('2026-10-17');
    expect(patchChecks.some((entry) => entry.detail.includes('本站未逐设备复测'))).toBe(true);
    expect(mapDirectory[0]?.description).toContain('VIII号残片位置');
    expect(mapDirectory[0]?.description).toContain('尚未发布新坐标');
  });

  it('separates permanent rewards, unverified banners and unverified codes', () => {
    expect(launchDayVerification.find((item) => item.id === 'permanent-rewards')?.status).toBe('官方已公开');
    expect(launchDayVerification.find((item) => item.id === 'banners')?.status).toBe('待逐项核验');
    expect(launchDayVerification.find((item) => item.id === 'codes')?.summary).toContain('不等于不存在');
    expect(redeemCodeStatus.codes).toEqual([]);
    expect(launchRewards[0]?.note).toContain('不是首周到期福利');
    expect(firstWeekRoute[1]?.steps[0]).toContain('第2天');
    expect(firstWeekRoute[2]?.steps[0]).toContain('第7天');
  });

  it('adds source-backed archive names without silently merging unresolved names', () => {
    expect(playableCharacters).toHaveLength(13);
    expect(new Set(playableCharacters.map((entry) => entry.slug)).size).toBe(playableCharacters.length);
    for (const slug of ['fulizi', 'lilang', 'daliya']) {
      expect(playableCharacters.some((entry) => entry.slug === slug)).toBe(true);
      expect(new URL(characterSources[slug]!.url).hostname).toBe('www.taptap.cn');
    }
    expect(playableCharacters.find((entry) => entry.slug === 'lita')?.name).toBe('莉塔');
    expect(playableCharacters.find((entry) => entry.slug === 'fulizi')?.note).toContain('别名对应待核验');
    expect(clientEvidenceChecklist[0]).toContain('不能冒充实测日期');
  });
});
