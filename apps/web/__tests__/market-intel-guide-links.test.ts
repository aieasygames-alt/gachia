import { describe, expect, it } from 'vitest';
import genshinGuides from '../public/data/genshin/raw-guides.json';
import starrailGuides from '../public/data/starrail/raw-guides.json';
import wuwaGuides from '../public/data/wuwa/raw-guides.json';
import nteGuides from '../public/data/nte/raw-guides.json';
import zzzGuides from '../public/data/zzz/raw-guides.json';
import guihuanGuides from '../public/data/guihuan/raw-guides.json';
import anantaGuides from '../public/data/ananta/raw-guides.json';
import endfieldGuides from '../public/data/endfield/raw-guides.json';
import seaGuides from '../public/data/sea/raw-guides.json';
import skjhGuides from '../public/data/skjh/raw-guides.json';
import rocoGuides from '../public/data/roco/raw-guides.json';
import rocoCnGuides from '../public/data/roco-cn/raw-guides.json';
import aniimoGuides from '../public/data/aniimo/raw-guides.json';
import { MARKET_INTEL_OPPORTUNITIES } from '@/lib/market-intel';
import { VERSION_SNAPSHOTS } from '@/lib/version-snapshots';

const guideIdsByGame = {
  genshin: new Set(genshinGuides.map((guide) => guide.id)),
  starrail: new Set(starrailGuides.map((guide) => guide.id)),
  wuwa: new Set(wuwaGuides.map((guide) => guide.id)),
  nte: new Set(nteGuides.map((guide) => guide.id)),
  zzz: new Set(zzzGuides.map((guide) => guide.id)),
  guihuan: new Set(guihuanGuides.map((guide) => guide.id)),
  ananta: new Set(anantaGuides.map((guide) => guide.id)),
  endfield: new Set(endfieldGuides.map((guide) => guide.id)),
  sea: new Set(seaGuides.map((guide) => guide.id)),
  skjh: new Set(skjhGuides.map((guide) => guide.id)),
  roco: new Set(rocoGuides.map((guide) => guide.id)),
  'roco-cn': new Set(rocoCnGuides.map((guide) => guide.id)),
  aniimo: new Set(aniimoGuides.map((guide) => guide.id)),
};

const expectedNewGuides = {
  genshin: 'nod-krai-cryoculus-phase-ii-checklist',
  zzz: 'v3-2-livestream-recap-expired-codes',
  endfield: 'official-download-specs-homecoming-faq',
  sea: 'early-2027-december-closed-beta-faq',
  wuwa: 'v3-6-qingxiao-jingran-post-launch-route',
  nte: 'aug31-sep14-event-calendar-999-nights',
  skjh: 'server-mode-choice',
  starrail: '4x-fate-gilgamesh-kafka-cyrene-evergreen-plan',
  guihuan: 'test-release-timeline-guide',
  roco: 'cbt-registration-guide',
  'roco-cn': 's2-season-guide',
  aniimo: ['s1-new-player-route', 'rainbow-aniimo-guide', 'homeland-resource-guide'],
};

describe('market-intel guide links', () => {
  it('keeps the Roco global rollout sequence published and reachable', () => {
    const roadmapGuideIds = [
      'global-cn-content-roadmap',
      'global-launch-readiness-checklist',
      'global-first-30-days-pve-plan',
      'global-days-31-90-season-event-plan',
      'global-cn-release-governance',
      'global-live-ops-metrics-experiments',
    ];
    const snapshotGuideLinks = VERSION_SNAPSHOTS.roco?.links.map((link) => link.href) ?? [];

    for (const guideId of roadmapGuideIds) {
      expect(guideIdsByGame.roco.has(guideId)).toBe(true);
      expect(snapshotGuideLinks).toContain(`/roco/guides/${guideId}`);
    }
  });

  it('keeps the guide slugs required by the 2026-09-30 batch', () => {
    for (const [gameId, guideIds] of Object.entries(expectedNewGuides)) {
      for (const guideId of Array.isArray(guideIds) ? guideIds : [guideIds]) {
        expect(guideIdsByGame[gameId as keyof typeof guideIdsByGame].has(guideId)).toBe(true);
      }
    }
  });

  it('keeps all Aniimo S1 guide entry points in the version hub', () => {
    const aniimoGuideLinks = VERSION_SNAPSHOTS.aniimo?.links
      .filter((link) => link.href.includes('/guides/'))
      .map((link) => link.href) ?? [];

    expect(aniimoGuideLinks).toEqual(expect.arrayContaining([
      '/aniimo/guides/s1-new-player-route',
      '/aniimo/guides/rainbow-aniimo-guide',
      '/aniimo/guides/homeland-resource-guide',
    ]));
  });

  it('keeps guide links in version snapshots resolvable', () => {
    for (const [gameId, snapshot] of Object.entries(VERSION_SNAPSHOTS)) {
      if (!snapshot) continue;
      const guideIds = guideIdsByGame[gameId as keyof typeof guideIdsByGame];
      if (!guideIds) continue;

      for (const link of snapshot.links.filter((link) => link.href.includes('/guides/'))) {
        const slug = link.href.split('/guides/')[1];
        expect(slug).toBeDefined();
        if (!slug) continue;
        expect(guideIds.has(slug)).toBe(true);
      }
    }
  });

  it('keeps every completed opportunity tied to at least one reachable guide or hub page', () => {
    for (const opportunity of MARKET_INTEL_OPPORTUNITIES) {
      expect(opportunity.status).toBe('done');
      expect(opportunity.targetPages.some((page) => page.includes('/guides/') || page.endsWith('/version'))).toBe(true);
    }
  });

  it('keeps GSC Aniimo map and code answers explicit', () => {
    const byId = new Map(aniimoGuides.map((guide) => [guide.id, guide]));
    const mapGuide = byId.get('map-regions');
    const codeGuide = byId.get('codes-rewards');

    expect(mapGuide?.serpDescription?.en).toContain('not a marker-by-marker interactive map');
    expect(mapGuide?.quickFacts?.en).toContain('This page is a public-region guide, not a marker-by-marker interactive map.');
    expect(codeGuide?.serpDescription?.en).toContain('No public Aniimo redeem code is confirmed');
    expect(codeGuide?.quickFacts?.en).toContain('Current answer: no public Aniimo redeem code is confirmed.');
  });

  it('keeps legacy Aniimo entry pages in the S1 live-client context', () => {
    const byId = new Map(aniimoGuides.map((guide) => [guide.id, guide]));
    const downloadGuide = byId.get('download');
    const releaseGuide = byId.get('release-date');
    const beginnerGuide = byId.get('beginner-guide');
    const mapGuide = byId.get('map-regions');

    expect(downloadGuide?.currentVersion).toContain('S1 live across platforms');
    expect(releaseGuide?.summaryEn).toContain('live across platforms');
    expect(releaseGuide?.summaryJa).toContain('全プラットフォームで配信中');
    expect(beginnerGuide?.currentVersion).toContain('S1 live systems reference');
    expect(beginnerGuide?.updatedAt).toBe('2026-09-30');
    expect(mapGuide?.currentVersion).toContain('S1 live public-region reference');
  });
});
