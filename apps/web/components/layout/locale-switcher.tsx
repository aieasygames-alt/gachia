'use client';

import { LOCALE_NAMES } from '@gachia/core';
import type { SupportedLocale } from '@gachia/core';
import { Link, usePathname } from '@/lib/i18n/navigation';

interface LocaleSwitcherProps {
  locale: SupportedLocale;
}

export function LocaleSwitcher({ locale }: LocaleSwitcherProps) {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-2">
      {Object.entries(LOCALE_NAMES).map(([loc, name]) => (
        <Link
          key={loc}
          href={pathname || '/'}
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
  );
}
