import Link from 'next/link';
import { GAMES, CATEGORY_LABELS } from '@gachia/core';
import type { SupportedLocale } from '@gachia/core';
import { createSharedHeaderModel } from '@gachia/ui';

const routes = ['characters', 'weapons', 'artifacts', 'items', 'guides', 'redeem-codes', 'version', 'gacha', 'build', 'teams', 'tier-list', 'compare', 'calculator', 'map', 'download'] as const;

export function GameNav({ locale, current }: { locale: SupportedLocale; current?: string }) {
  const header = createSharedHeaderModel(locale);
  return <header><nav className="site-nav" aria-label="Genshin navigation"><Link href={`/${locale}`}>Gachia</Link>{header.featuredGames.map((game) => <Link key={game.id} href={`/${locale}/${game.id}`}>{game.label}</Link>)}<Link href={`/${locale}/games`}>{header.moreGamesLabel}</Link></nav><nav className="site-nav" aria-label="Genshin sections"><Link href={`/${locale}/genshin`} aria-current={!current ? 'page' : undefined}>{GAMES.genshin.name[locale]}</Link>{routes.map((route) => <Link key={route} href={`/${locale}/genshin/${route}`} aria-current={current === route ? 'page' : undefined}>{CATEGORY_LABELS[route]?.[locale] ?? route}</Link>)}</nav></header>;
}
