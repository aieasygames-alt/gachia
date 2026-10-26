'use client';

import { useState, useEffect, useRef } from 'react';
import { GAMES } from '@gachia/core';
import { createSharedHeaderModel } from '@gachia/ui';
import type { SupportedLocale } from '@gachia/core';
import { Link } from '@/lib/i18n/navigation';
import { LocaleSwitcher } from './locale-switcher';
import { UserMenu } from '@/components/auth/user-menu';
import { AuthDialog } from '@/components/auth/auth-dialog';
import { useSession } from '@/lib/auth-client';
import { ACCOUNT_FEATURES_ENABLED } from '@/lib/site-features';
import { Search } from 'lucide-react';
import { SearchLoader } from '@/components/search/search-loader';

interface SiteHeaderProps {
  locale: SupportedLocale;
}

export function SiteHeader({ locale }: SiteHeaderProps) {
  const [modal, setModal] = useState<'search' | 'auth' | null>(null);
  const searchOpen = modal === 'search';
  const setSearchOpen = (open: boolean) => setModal(open ? 'search' : null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const authOpen = modal === 'auth';
  const setAuthOpen = (open: boolean) => setModal(open ? 'auth' : null);
  const [mounted, setMounted] = useState(false);

  // Keyboard shortcut: Cmd/Ctrl+K to open search
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!e.isComposing && modal === null && (e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchTriggerRef.current?.focus();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [modal]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const header = createSharedHeaderModel(locale);

  return (
    <>
      <header className="gachia-header sticky top-0 z-50 bg-game-bg lg:bg-transparent">
        <div className="gachia-header__top border-b border-game-border bg-game-bg/90 shadow-lg shadow-black/10 backdrop-blur-xl">
          <div className="gachia-header__container container mx-auto flex h-16 max-w-full items-center gap-2 px-3 sm:gap-4 sm:px-4">
            <Link href="/" className="gachia-header__brand flex shrink-0 items-center gap-3">
              <img src="/images/logo.webp" alt="Gachia" width={36} height={36} className="h-9 w-9 rounded-lg" />
              <span className="text-xl font-black text-game-text">Gachia</span>
            </Link>
            <nav className="gachia-header__games hidden min-w-0 flex-1 flex-wrap items-center gap-1 lg:flex" aria-label="Game navigation">
              {header.featuredGames.map((game) => (
                <Link key={game.id} href={`/${game.id}` as '/'} className="shrink-0 rounded-md px-2.5 py-1.5 text-sm font-semibold text-game-text-muted transition-colors hover:bg-game-surface-alt hover:text-game-primary">
                  {game.label}
                </Link>
              ))}
              <Link href="/games" className="shrink-0 rounded-md border border-game-border px-2.5 py-1.5 text-sm font-semibold text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary">{header.moreGamesLabel}</Link>
            </nav>
            <div className="gachia-header__actions flex items-center gap-2">
            {/* Search Button */}
            <button
              ref={searchTriggerRef}
              disabled={!mounted}
              aria-busy={!mounted}
              onClick={() => setSearchOpen(true)}
              aria-label={mounted ? (locale === 'zh' ? '搜索' : locale === 'ja' ? '検索' : 'Search') : (locale === 'zh' ? '搜索准备中' : locale === 'ja' ? '検索を準備中' : 'Preparing search')}
              className="flex items-center gap-2 rounded-lg border border-game-border bg-game-surface px-3 py-2 text-sm font-medium text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary disabled:cursor-wait disabled:opacity-50"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">
                {mounted ? (locale === 'zh' ? '搜索' : locale === 'ja' ? '検索' : 'Search') : (locale === 'zh' ? '搜索准备中' : locale === 'ja' ? '検索を準備中' : 'Preparing search')}
              </span>
              <kbd className="hidden sm:inline-block rounded border border-game-border bg-game-surface-alt px-1 py-0.5 text-[10px]">
                ⌘K
              </kbd>
            </button>

            <LocaleSwitcher locale={locale} />

            {/* Auth */}
            {ACCOUNT_FEATURES_ENABLED && (mounted ? (
              <AuthGate locale={locale} onOpenAuth={() => setAuthOpen(true)} />
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="rounded-lg border border-game-border bg-game-surface px-3 py-1.5 text-sm text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary"
              >
                {locale === 'zh' ? '登录' : locale === 'ja' ? 'ログイン' : 'Login'}
              </button>
            ))}
            </div>
          </div>
        </div>
        <div className="gachia-header__games container mx-auto flex max-w-full flex-wrap gap-2 px-4 pb-3 lg:hidden">
          {header.featuredGames.map((game) => (
            <Link
              key={game.id}
              href={`/${game.id}` as '/'}
              className="shrink-0 rounded-full border border-game-border bg-game-surface px-3 py-1.5 text-xs font-semibold text-game-text-muted"
            >
              {game.label}
            </Link>
          ))}
          <Link href="/games" className="shrink-0 rounded-full border border-game-border bg-game-surface px-3 py-1.5 text-xs font-semibold text-game-text-muted">
            {header.moreGamesLabel}
          </Link>
        </div>
      </header>

      {searchOpen ? <SearchLoader locale={locale} open={searchOpen} onClose={() => setSearchOpen(false)} /> : null}
      {ACCOUNT_FEATURES_ENABLED && authOpen ? <AuthDialog open={authOpen} onClose={() => setAuthOpen(false)} /> : null}
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
