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
};

const expectedNewGuides = {
  genshin: 'nod-krai-cryoculus-phase-ii-checklist',
  zzz: 'v3-2-livestream-recap-expired-codes',
  endfield: 'steam-pioneer-test-registration-faq',
  sea: 'early-2027-december-closed-beta-faq',
  wuwa: 'v3-6-qingxiao-jingran-post-launch-route',
  nte: 'aug31-sep14-event-calendar-999-nights',
  skjh: 'aug31-event-ended-beginner-catchup',
  starrail: '4x-fate-gilgamesh-kafka-cyrene-evergreen-plan',
  guihuan: 'test-release-timeline-guide',
};

describe('market-intel guide links', () => {
  it('creates the guide slugs introduced by the 2026-08-31 batch', () => {
    for (const [gameId, guideId] of Object.entries(expectedNewGuides)) {
      expect(guideIdsByGame[gameId as keyof typeof guideIdsByGame].has(guideId)).toBe(true);
    }
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
});
