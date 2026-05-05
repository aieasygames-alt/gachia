import { ChevronRight } from 'lucide-react';
import { GAMES, CATEGORY_LABELS, LOCALE_NAMES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { Link } from '@/lib/i18n/navigation';

interface BreadcrumbsProps {
  lang: string;
  game: GameId;
  category?: string;
  slug?: string;
  slugLabel?: string;
}

export function Breadcrumbs({ lang, game, category, slug, slugLabel }: BreadcrumbsProps) {
  const locale = lang as SupportedLocale;
  const gameConfig = GAMES[game];

  const items: Array<{ label: string; href?: string }> = [
    { label: LOCALE_NAMES[locale], href: '/' },
    { label: gameConfig.name[locale], href: `/${game}` as '/' },
  ];

  if (category) {
    items.push({
      label: CATEGORY_LABELS[category]?.[locale] ?? category,
      href: `/${game}/${category}` as '/',
    });
  }

  if (slug && slugLabel) {
    items.push({ label: slugLabel });
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center gap-1 text-sm text-game-text-muted">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3" />}
            {item.href ? (
              <Link href={item.href} className="hover:text-game-primary transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className="text-game-text">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
