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
import { ChevronDown, Gamepad2, Search, Sparkles } from 'lucide-react';

const SearchDialog = dynamic(
  () => import('@/components/search/search-dialog').then((m) => m.SearchDialog),
  { ssr: false },
);

interface SiteHeaderProps {
  locale: SupportedLocale;
}

const FEATURED_GAMES = ['genshin', 'wuwa', 'zzz', 'roco', 'skjh'] as const;

const NAV_GROUPS = [
  {
    label: { zh: '长期运营', en: 'Live Service', ja: '運営中' },
    ids: ['genshin', 'starrail', 'wuwa', 'zzz'],
  },
  {
    label: { zh: '新游观察', en: 'Launch Watch', ja: '新作注目' },
    ids: ['roco', 'roco-cn', 'skjh', 'endfield', 'nte'],
  },
  {
    label: { zh: '资料补全', en: 'Data Track', ja: 'データ整理' },
    ids: ['sea', 'ananta', 'guihuan'],
  },
] as const;

function getCompactGameName(gameId: (typeof FEATURED_GAMES)[number], locale: SupportedLocale) {
  if (locale === 'zh' && gameId === 'roco') return '洛克国际服';
  if (locale === 'zh' && gameId === 'skjh') return '世界计划';
  if (locale === 'ja' && gameId === 'roco') return 'Roco';
  return GAMES[gameId].name[locale];
}

export function SiteHeader({ locale }: SiteHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [gamesOpen, setGamesOpen] = useState(false);
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
      <header className="sticky top-0 z-50 border-b border-game-border bg-game-bg/90 shadow-lg shadow-black/10 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <Image src="/images/logo.webp" alt="Gachia" width={36} height={36} className="h-9 w-9 rounded-lg" />
            <span className="text-xl font-black text-game-text">Gachia</span>
          </Link>

          {/* Game Switcher */}
          <nav className="hidden min-w-0 flex-1 items-center gap-2 lg:flex">
            {FEATURED_GAMES.map((gameId) => (
              <Link
                key={gameId}
                href={`/${gameId}` as '/'}
                className="max-w-36 truncate rounded-full border border-game-border bg-game-surface/70 px-3 py-1.5 text-sm font-semibold text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary"
              >
                {getCompactGameName(gameId, locale)}
              </Link>
            ))}
            <div
              className="relative"
              onMouseEnter={() => setGamesOpen(true)}
              onMouseLeave={() => setGamesOpen(false)}
            >
              <button
                type="button"
                onClick={() => setGamesOpen((open) => !open)}
                className="inline-flex items-center gap-2 rounded-full border border-game-border bg-game-surface/70 px-3 py-1.5 text-sm font-semibold text-game-text-muted transition-colors hover:border-game-primary hover:text-game-primary"
              >
                <Gamepad2 className="h-4 w-4" aria-hidden="true" />
                {locale === 'zh' ? '全部游戏' : locale === 'ja' ? '全ゲーム' : 'All games'}
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </button>
              {gamesOpen ? (
                <div className="absolute left-0 top-full w-[560px] pt-3">
                  <div className="grid grid-cols-3 gap-3 rounded-lg border border-game-border bg-game-surface p-4 shadow-2xl shadow-black/30">
                    {NAV_GROUPS.map((group) => (
                      <div key={group.label.en}>
                        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-game-text-muted">
                          <Sparkles className="h-3.5 w-3.5 text-game-primary" aria-hidden="true" />
                          {group.label[locale]}
                        </div>
                        <div className="space-y-1.5">
                          {group.ids.map((gameId) => (
                            <Link
                              key={gameId}
                              href={`/${gameId}` as '/'}
                              className="block rounded-md border border-transparent px-3 py-2 text-sm font-medium text-game-text transition-colors hover:border-game-border hover:bg-game-surface-alt"
                              style={{ color: GAMES[gameId].theme.primary }}
                              onClick={() => setGamesOpen(false)}
                            >
                              {GAMES[gameId].name[locale]}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </nav>

          <div className="flex items-center gap-2">
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
        <div className="container mx-auto flex gap-2 overflow-x-auto px-4 pb-3 lg:hidden">
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
