'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { GAMES, GAME_IDS } from '@gachia/core';
import { headerFeaturedGameIds } from '@gachia/ui';
import type { SupportedLocale } from '@gachia/core';
import { Link } from '@/lib/i18n/navigation';
import { LocaleSwitcher } from './locale-switcher';
import { UserMenu } from '@/components/auth/user-menu';
import { AuthDialog } from '@/components/auth/auth-dialog';
import { useSession } from '@/lib/auth-client';
import { Search } from 'lucide-react';

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
  const [mounted, setMounted] = useState(false);

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

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      <header className="gachia-header sticky top-0 z-50">
        <div className="gachia-header__top border-b border-game-border bg-game-bg/90 shadow-lg shadow-black/10 backdrop-blur-xl">
          <div className="gachia-header__container container mx-auto flex h-16 items-center gap-4 px-4">
            <Link href="/" className="gachia-header__brand flex shrink-0 items-center gap-3">
              <img src="/images/logo.webp" alt="Gachia" width={36} height={36} className="h-9 w-9 rounded-lg" />
              <span className="text-xl font-black text-game-text">Gachia</span>
            </Link>
            <nav className="gachia-header__games hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto lg:flex" aria-label="Game navigation">
              {headerFeaturedGameIds.map((gameId) => (
                <Link key={gameId} href={`/${gameId}` as '/'} className="shrink-0 rounded-md px-2.5 py-1.5 text-sm font-semibold text-game-text-muted transition-colors hover:bg-game-surface-alt hover:text-game-primary">
                  {GAMES[gameId].name[locale]}
                </Link>
              ))}
              <Link href="/games" className="shrink-0 rounded-md border border-game-border px-2.5 py-1.5 text-sm font-semibold text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">{locale === 'zh' ? '更多游戏' : locale === 'ja' ? 'その他のゲーム' : 'More games'}</Link>
            </nav>
            <div className="gachia-header__actions flex items-center gap-2">
            {/* Search Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 rounded-lg border border-game-border bg-game-surface px-3 py-2 text-sm font-medium text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">
                {locale === 'zh' ? '搜索' : locale === 'ja' ? '検索' : 'Search'}
              </span>
              <kbd className="hidden sm:inline-block rounded border border-game-border bg-game-surface-alt px-1 py-0.5 text-[10px]">
                ⌘K
              </kbd>
            </button>

            <LocaleSwitcher locale={locale} />

            {/* Auth */}
            {mounted ? (
              <AuthGate locale={locale} onOpenAuth={() => setAuthOpen(true)} />
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
        </div>
        <div className="gachia-header__games container mx-auto flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden">
          {GAME_IDS.map((gameId) => (
            <Link
              key={gameId}
              href={`/${gameId}` as '/'}
              className="shrink-0 rounded-full border border-game-border bg-game-surface px-3 py-1.5 text-xs font-semibold text-game-text-muted"
            >
              {GAMES[gameId].name[locale]}
            </Link>
          ))}
        </div>
      </header>

      {searchOpen ? <SearchDialog locale={locale} open={searchOpen} onClose={() => setSearchOpen(false)} /> : null}
      {authOpen ? <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} /> : null}
    </>
  );
}

function AuthGate({ locale, onOpenAuth }: { locale: SupportedLocale; onOpenAuth: () => void }) {
  const { data: session } = useSession();

  if (session) {
    return <UserMenu />;
  }

  return (
    <button
      onClick={onOpenAuth}
      className="rounded-lg border border-game-border bg-game-surface px-3 py-1.5 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary"
    >
      {locale === 'zh' ? '登录' : locale === 'ja' ? 'ログイン' : 'Login'}
    </button>
  );
}
