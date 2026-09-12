import Link from 'next/link';
import { CATEGORY_LABELS, GAMES } from '@gachia/core';
import type { SupportedLocale } from '@gachia/core';
import { createSharedHeaderModel } from '@gachia/ui';

export function NteNav({ locale, current }: { locale: SupportedLocale; current?: string }) {
  const header = createSharedHeaderModel(locale);
  const enabledRoutes = Object.entries(GAMES.nte.routes)
    .filter(([, enabled]) => enabled)
    .map(([route]) => route);
  return <header className="gachia-header"><div className="gachia-header__top"><div className="gachia-header__container"><Link className="gachia-header__brand" href={`/${locale}`}><span className="gachia-header__logo">G</span><span>Gachia</span></Link><nav className="gachia-header__games" aria-label="Game navigation">{header.featuredGames.map((game) => <Link key={game.id} href={`/${locale}/${game.id}`} className="gachia-header__game-link">{game.label}</Link>)}<details className="gachia-header__all"><summary>{header.moreGamesLabel}</summary><div className="gachia-header__all-menu">{header.moreGames.map((game) => <Link key={game.id} href={`/${locale}/${game.id}`} className={game.id === 'nte' ? 'gachia-header__game--current' : undefined}>{game.label}</Link>)}</div></details></nav><div className="gachia-header__locale">{header.languages.map((target) => <Link key={target.locale} href={`/${target.locale}/nte${current ? `/${current}` : ''}`} aria-current={target.locale === locale ? 'page' : undefined}>{target.label}</Link>)}</div></div></div><div className="gachia-header__section-wrap"><nav className="gachia-header__section" aria-label="NTE navigation">{enabledRoutes.map((route) => <Link key={route} className={current === route ? 'gachia-header__section-link--current' : undefined} href={`/${locale}/nte/${route}`}>{CATEGORY_LABELS[route]?.[locale] ?? route}</Link>)}</nav></div></header>;
}
