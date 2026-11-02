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
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Gachia', item: 'https://gachia.com' },
      { '@type': 'ListItem', position: 2, name: 'NTE', item: `https://gachia.com/${locale}/nte` },
      ...(current ? [{ '@type': 'ListItem', position: 3, name: current, item: `https://gachia.com/${locale}/nte/${current}` }] : []),
    ],
  };
  return <><SharedGameHeader header={header} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} /></>;
}
