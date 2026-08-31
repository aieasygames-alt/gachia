import type { GameId, SupportedLocale } from '@gachia/core';

export interface GuideListEntry {
  id: string;
  title: string;
  summary: string;
  category: string;
  categoryLabel: string;
  tags: string[];
  updatedAt?: string;
  currentVersion?: string;
  raw?: unknown;
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
    raw: guide,
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

export async function getGuideListData(
  gameId: GameId,
  locale: SupportedLocale,
): Promise<GuideListData> {
  switch (gameId) {
    case 'genshin': {
      const mod = await import('@gachia/data/games/genshin/guides');
      return buildGuideListData(mod.genshinGuides, locale, mod.getGuideTitle, mod.getGuideSummary, mod.getGuideCategory);
    }
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
