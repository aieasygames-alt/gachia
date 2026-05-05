import { useTranslations } from 'next-intl';
import { GAMES, GAME_IDS, LOCALE_NAMES } from '@gachia/core';
import type { SupportedLocale } from '@gachia/core';
import { Link } from '@/lib/i18n/navigation';

interface SiteHeaderProps {
  locale: SupportedLocale;
}

export function SiteHeader({ locale }: SiteHeaderProps) {
  const t = useTranslations('nav');

  return (
    <header className="sticky top-0 z-50 border-b border-game-border bg-game-bg/80 backdrop-blur-md">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="text-xl font-bold text-game-primary">
          Gachia
        </Link>

        {/* Game Switcher */}
        <nav className="hidden items-center gap-4 md:flex">
          {GAME_IDS.map((gameId) => (
            <Link
              key={gameId}
              href={`/${gameId}` as '/'}
              className="text-sm text-game-text-muted transition-colors hover:text-game-primary"
              style={{ '--hover-color': GAMES[gameId].theme.primary } as React.CSSProperties}
            >
              {GAMES[gameId].name[locale]}
            </Link>
          ))}
        </nav>

        {/* Locale Switcher */}
        <div className="flex items-center gap-2">
          {Object.entries(LOCALE_NAMES).map(([loc, name]) => (
            <Link
              key={loc}
              href="/"
              locale={loc as SupportedLocale}
              className={`rounded px-2 py-1 text-xs ${
                locale === loc
                  ? 'bg-game-primary text-game-bg font-medium'
                  : 'text-game-text-muted hover:text-game-text'
              }`}
            >
              {name}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
