import type { GameId, SupportedLocale } from '@gachia/core';
import { join } from 'node:path';
import { loadJson } from '@gachia/data/load-json';
import { isGuideReadable } from '../retired-pages';

export interface GuideListEntry {
  id: string;
  title: string;
  summary: string;
  category: string;
  categoryLabel: string;
  tags: string[];
  updatedAt?: string;
  currentVersion?: string;
  contentReview?: {
    status: 'needs_verification'; reviewedAt: string; kind?: 'editorial_proposal_archive';
  };
}

export interface GuideListData {
  guides: GuideListEntry[];
  categories: string[];
  categoryLabels: Record<string, string>;
}

type RawGuide = {
  id: string;
  category: string;
  tags?: string[];
  updatedAt?: string;
  currentVersion?: string;
  contentReview?: GuideListEntry['contentReview'];
};

type SeaGuideSummary = RawGuide & {
  title: string;
  titleEn: string;
  titleJa?: string;
  summary: string;
  summaryEn: string;
  summaryJa?: string;
  categoryZh: string;
  categoryEn: string;
  categoryJa?: string;
};

function toGuideListEntry<T extends RawGuide>(
  guide: T,
  locale: SupportedLocale,
  getTitle: (guide: T, locale: SupportedLocale) => string,
  getSummary: (guide: T, locale: SupportedLocale) => string,
  getCategory: (guide: T, locale: SupportedLocale) => string,
): GuideListEntry {
  return {
    id: guide.id,
    title: getTitle(guide, locale),
    summary: getSummary(guide, locale),
    category: guide.category,
    categoryLabel: getCategory(guide, locale),
    tags: guide.tags ?? [],
    updatedAt: guide.updatedAt,
    currentVersion: guide.currentVersion,
    ...(guide.contentReview ? { contentReview: guide.contentReview } : {}),
  };
}

function buildGuideListData<T extends RawGuide>(
  guides: T[],
  locale: SupportedLocale,
  getTitle: (guide: T, locale: SupportedLocale) => string,
  getSummary: (guide: T, locale: SupportedLocale) => string,
  getCategory: (guide: T, locale: SupportedLocale) => string,
): GuideListData {
  const entries = guides.map((guide) => toGuideListEntry(guide, locale, getTitle, getSummary, getCategory));
  const categories = [...new Set(entries.map((guide) => guide.category))];
  const categoryLabels = Object.fromEntries(
    categories.map((category) => [
      category,
      entries.find((guide) => guide.category === category)?.categoryLabel ?? category,
    ]),
  );
  return { guides: entries, categories, categoryLabels };
}

export async function getGuideListData(gameId: GameId, locale: SupportedLocale): Promise<GuideListData> {
  const data = await loadGuideListData(gameId, locale);
  const guides = data.guides.filter(guide => isGuideReadable(gameId, guide.id, locale));
  const categories = [...new Set(guides.map(guide => guide.category))];
  return { guides, categories, categoryLabels: Object.fromEntries(categories.map(category => [category, data.categoryLabels[category] ?? category])) };
}

async function loadGuideListData(
  gameId: GameId,
  locale: SupportedLocale,
): Promise<GuideListData> {
  switch (gameId) {
    case 'starrail': {
      const mod = await import('@gachia/data/games/starrail/guides');
      return buildGuideListData(mod.starrailGuides, locale, mod.getGuideTitle, mod.getGuideSummary, mod.getGuideCategory);
    }
    case 'nte': {
      const mod = await import('@gachia/data/games/nte/guides');
      return buildGuideListData(mod.guides, locale, mod.getGuideTitle, mod.getGuideSummary, mod.getGuideCategory);
    }
    case 'wuwa': {
      const mod = await import('@gachia/data/games/wuwa/guides');
      return buildGuideListData(mod.wuwaGuides, locale, mod.getGuideTitle, mod.getGuideSummary, mod.getGuideCategory);
    }
    case 'zzz': {
      const mod = await import('@gachia/data/games/zzz/guides');
      return buildGuideListData(mod.zzzGuides, locale, mod.getZzzGuideTitle, mod.getZzzGuideSummary, mod.getZzzGuideCategory);
    }
    case 'hi3': {
      const mod = await import('@gachia/data/games/hi3/guides');
      return buildGuideListData(mod.hi3Guides, locale, mod.getHi3GuideTitle, mod.getHi3GuideSummary, mod.getHi3GuideCategory);
    }
    case 'ananta': {
      const mod = await import('@gachia/data/games/ananta/guides');
      return buildGuideListData(mod.anantaGuides, locale, mod.getAnantaGuideTitle, mod.getAnantaGuideSummary, mod.getAnantaGuideCategory);
    }
    case 'guihuan': {
      const mod = await import('@gachia/data/games/guihuan/guides');
      return buildGuideListData(mod.guihuanGuides, locale, mod.getGuihuanGuideTitle, mod.getGuihuanGuideSummary, mod.getGuihuanGuideCategory);
    }
    case 'endfield': {
      const mod = await import('@gachia/data/games/endfield/guides');
      return buildGuideListData(mod.endfieldGuides, locale, mod.getEndfieldGuideTitle, mod.getEndfieldGuideSummary, mod.getEndfieldGuideCategory);
    }
    case 'sea': {
      try {
        const summaries = await loadJson<SeaGuideSummary[]>(join(process.cwd(), '../../apps/web/public/data-client/sea/guides.json'), '/data-client/sea/guides.json');
        return buildGuideListData(
          summaries,
          locale,
          (guide, currentLocale) => currentLocale === 'zh' ? guide.title : currentLocale === 'ja' ? (guide.titleJa ?? guide.titleEn) : guide.titleEn,
          (guide, currentLocale) => currentLocale === 'zh' ? guide.summary : currentLocale === 'ja' ? (guide.summaryJa ?? guide.summaryEn) : guide.summaryEn,
          (guide, currentLocale) => currentLocale === 'zh' ? guide.categoryZh : currentLocale === 'ja' ? (guide.categoryJa ?? guide.categoryEn) : guide.categoryEn,
        );
      } catch {
        // Fall back to the complete guide module for local setups or stale assets.
      }
      const mod = await import('@gachia/data/games/sea/guides');
      return buildGuideListData(mod.seaGuides, locale, mod.getSeaGuideTitle, mod.getSeaGuideSummary, mod.getSeaGuideCategory);
    }
    case 'skjh': {
      const mod = await import('@gachia/data/games/skjh/guides');
      return buildGuideListData(mod.skjhGuides, locale, mod.getSkjhGuideTitle, mod.getSkjhGuideSummary, mod.getSkjhGuideCategory);
    }
    case 'roco': {
      const mod = await import('@gachia/data/games/roco/guides');
      return buildGuideListData(mod.rocoGuides, locale, mod.getRocoGuideTitle, mod.getRocoGuideSummary, mod.getRocoGuideCategory);
    }
    case 'roco-cn': {
      const mod = await import('@gachia/data/games/roco-cn/guides');
      return buildGuideListData(mod.rocoCnGuides, locale, mod.getRocoCnGuideTitle, mod.getRocoCnGuideSummary, mod.getRocoCnGuideCategory);
    }
    case 'aniimo': {
      const mod = await import('@gachia/data/games/aniimo/guides');
      return buildGuideListData(mod.aniimoGuides, locale, mod.getAniimoGuideTitle, mod.getAniimoGuideSummary, mod.getAniimoGuideCategory);
    }
    default:
      return { guides: [], categories: [], categoryLabels: {} };
  }
}
