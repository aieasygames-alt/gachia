'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { GAMES, GAME_IDS } from '@gachia/core';
import type { SupportedLocale } from '@gachia/core';
import { Link } from '@/lib/i18n/navigation';
import { LocaleSwitcher } from './locale-switcher';
import { UserMenu } from '@/components/auth/user-menu';
import { AuthDialog } from '@/components/auth/auth-dialog';
import { useSession } from '@/lib/auth-client';

const SearchDialog = dynamic(
  () => import('@/components/search/search-dialog').then((m) => m.SearchDialog),
  { ssr: false },
);

interface SiteHeaderProps {
  locale: SupportedLocale;
}

export function SiteHeader({ locale }: SiteHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const { data: session } = useSession();

  // Keyboard shortcut: Cmd/Ctrl+K to open search
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-game-border bg-game-bg/80 backdrop-blur-md">
        <div className="container mx-auto flex h-14 items-center justify-between px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image src="/images/logo.webp" alt="Gachia" width={32} height={32} className="h-8 w-8" />
            <span className="text-xl font-bold text-game-primary">Gachia</span>
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

          <div className="flex items-center gap-2">
            {/* Search Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-game-border bg-game-surface px-3 py-1.5 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="hidden sm:inline">
                {locale === 'zh' ? '搜索' : locale === 'ja' ? '検索' : 'Search'}
              </span>
              <kbd className="hidden sm:inline-block rounded border border-game-border bg-game-surface-alt px-1 py-0.5 text-[10px]">
                ⌘K
              </kbd>
            </button>

            <LocaleSwitcher locale={locale} />

            {/* Auth */}
            {session ? (
              <UserMenu />
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="rounded-lg border border-game-border bg-game-surface px-3 py-1.5 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary"
              >
                {locale === 'zh' ? '登录' : locale === 'ja' ? 'ログイン' : 'Login'}
              </button>
            )}
          </div>
        </div>
      </header>

      <SearchDialog locale={locale} open={searchOpen} onClose={() => setSearchOpen(false)} />
      <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
