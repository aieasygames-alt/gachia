import { GAMES, CATEGORY_LABELS } from '@gachia/core';
import type { SupportedLocale } from '@gachia/core';
import { SharedGameHeader, createSharedGameHeaderModel } from '@gachia/ui';

const routes = ['characters', 'weapons', 'artifacts', 'items', 'guides', 'redeem-codes', 'version', 'gacha', 'build', 'teams', 'tier-list', 'compare', 'calculator', 'map', 'download'] as const;

export function GameNav({ locale, current, isHome = false }: { locale: SupportedLocale; current?: string; isHome?: boolean }) {
  const header = createSharedGameHeaderModel({
    gameId: 'genshin',
    locale,
    localeLinks: (['zh', 'en', 'ja'] as const).map((target) => ({ href: `/${target}/genshin${current ? `/${current}` : ''}`, label: target === 'zh' ? '中文' : target === 'ja' ? 'JA' : 'EN', current: target === locale })),
    sectionLabel: 'Genshin sections',
    sectionLinks: [{ href: `/${locale}/genshin`, label: GAMES.genshin.name[locale], current: isHome }, ...routes.map((route) => ({ href: `/${locale}/genshin/${route}`, label: CATEGORY_LABELS[route]?.[locale] ?? route, current: current === route }))],
  });
  return <SharedGameHeader header={header} />;
}
