import { CATEGORY_LABELS, GAMES } from '@gachia/core';
import type { SupportedLocale } from '@gachia/core';
import { SharedGameHeader, createSharedGameHeaderModel } from '@gachia/ui';

export function NteNav({ locale, current }: { locale: SupportedLocale; current?: string }) {
  const enabledRoutes = Object.entries(GAMES.nte.routes)
    .filter(([, enabled]) => enabled)
    .map(([route]) => route);
  const header = createSharedGameHeaderModel({
    gameId: 'nte',
    locale,
    localeLinks: (['zh', 'en', 'ja'] as const).map((target) => ({ href: `/${target}/nte${current ? `/${current}` : ''}`, label: target === 'zh' ? '中文' : target === 'ja' ? 'JA' : 'EN', current: target === locale })),
    sectionLabel: 'NTE navigation',
    sectionLinks: enabledRoutes.map((route) => ({ href: `/${locale}/nte/${route}`, label: CATEGORY_LABELS[route]?.[locale] ?? route, current: current === route })),
  });
  return <SharedGameHeader header={header} />;
}
