import type { SharedGameHeaderModel } from './index';

export function SharedGameHeader({ header }: { header: SharedGameHeaderModel }) {
  const gamePath = (gameId: string) => `https://gachia.com/${header.locale}/${gameId}`;

  return (
    <>
      <a className="skip-link" href="#main-content">{header.skipLabel}</a>
      <header className="gachia-header" data-gachia-header="2026-10-01">
        <div className="gachia-header__top">
          <div className="gachia-header__container">
            <a className="gachia-header__brand" href={header.brandHref}>
              <img className="gachia-header__logo" src="/images/logo.webp" alt="" width={32} height={32} /><span>Gachia</span>
            </a>
            <nav className="gachia-header__games" aria-label="Game navigation">
              {header.featuredGames.map((game) => <a key={game.id} href={gamePath(game.id)} className="gachia-header__game-link">{game.label}</a>)}
            </nav>
            <div className="gachia-header__actions">
              <a className="gachia-header__search" href={`https://gachia.com/${header.locale}/search?q=`} aria-label={header.searchLabel}><span aria-hidden="true">⌕</span><span>{header.searchLabel}</span></a>
              <nav className="gachia-header__locale" aria-label="Language navigation">
                {header.localeLinks.map((link) => <a key={link.href} href={link.href} aria-current={link.current ? 'page' : undefined}>{link.label}</a>)}
              </nav>
            </div>
          </div>
        </div>
        <details className="gachia-header__all"><summary>{header.moreGamesLabel}</summary><div className="gachia-header__all-menu">
          {header.moreGames.map((game) => <a key={game.id} href={gamePath(game.id)} className={game.id === header.gameId ? 'gachia-header__game--current' : undefined}>{game.label}</a>)}
        </div></details>
        <div className="gachia-header__section-wrap"><nav className="gachia-header__section" aria-label={header.sectionLabel}>
          {header.sectionLinks.map((link) => <a key={link.href} href={link.href} aria-current={link.current ? 'page' : undefined} className={link.current ? 'gachia-header__section-link--current' : undefined}>{link.label}</a>)}
        </nav></div>
      </header>
    </>
  );
}
