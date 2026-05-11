'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import type { SupportedLocale, GameId } from '@gachia/core';
import {
  genshinCharacters, getGenshinCharacterName,
  starrailCharacters, getStarRailCharacterName,
  wuwaCharacters, getWuWaCharacterName,
  nteCharacters, getNteCharacterName,
} from '@gachia/data';

interface SearchItem {
  id: string;
  gameId: GameId;
  name: string;
  nameAlt: string;
  type: 'character';
  url: string;
}

function t(locale: SupportedLocale, zh: string, en: string) {
  return locale === 'zh' ? zh : en;
}

function buildIndex(locale: SupportedLocale): SearchItem[] {
  const items: SearchItem[] = [];

  for (const c of genshinCharacters) {
    items.push({
      id: `genshin-char-${c.id}`,
      gameId: 'genshin',
      name: getGenshinCharacterName(c, locale),
      nameAlt: locale === 'zh' ? c.nameEn : c.name,
      type: 'character',
      url: `/genshin/characters/${c.id}`,
    });
  }
  for (const c of starrailCharacters) {
    items.push({
      id: `starrail-char-${c.id}`,
      gameId: 'starrail',
      name: getStarRailCharacterName(c, locale),
      nameAlt: locale === 'zh' ? c.nameEn : c.name,
      type: 'character',
      url: `/starrail/characters/${c.id}`,
    });
  }
  for (const c of wuwaCharacters) {
    items.push({
      id: `wuwa-char-${c.id}`,
      gameId: 'wuwa',
      name: getWuWaCharacterName(c, locale),
      nameAlt: locale === 'zh' ? c.nameEn : c.name,
      type: 'character',
      url: `/wuwa/characters/${c.id}`,
    });
  }
  for (const c of nteCharacters) {
    items.push({
      id: `nte-char-${c.id}`,
      gameId: 'nte',
      name: getNteCharacterName(c, locale),
      nameAlt: locale === 'zh' ? c.nameEn : c.name,
      type: 'character',
      url: `/nte/characters/${c.id}`,
    });
  }
  return items;
}

const GAME_NAMES: Record<string, Record<string, string>> = {
  genshin: { zh: '原神', en: 'Genshin', ja: '原神' },
  starrail: { zh: '星铁', en: 'Star Rail', ja: 'スタレ' },
  wuwa: { zh: '鸣潮', en: 'WuWa', ja: '鳴潮' },
  nte: { zh: '无限暖暖', en: 'NTE', ja: 'NTE' },
};

export function SearchDialog({ locale, open, onClose }: {
  locale: SupportedLocale;
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const index = useMemo(() => buildIndex(locale), [locale]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
    if (!open) { setQuery(''); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const results = useMemo(() => {
    if (!query.trim() || query.length < 1) return [];
    const q = query.toLowerCase();
    return index
      .filter((item) =>
        item.name.toLowerCase().includes(q) ||
        item.nameAlt.toLowerCase().includes(q) ||
        item.id.includes(q),
      )
      .slice(0, 20);
  }, [query, index]);

  if (!open) return null;

  const lang = locale === 'ja' ? 'ja' : locale;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-2xl rounded-xl border border-game-border bg-game-surface shadow-2xl" role="dialog" aria-modal="true">
        <div className="flex items-center gap-3 border-b border-game-border px-4 py-3">
          <svg className="h-5 w-5 shrink-0 text-game-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(locale, '搜索角色...', 'Search characters...')}
            className="flex-1 bg-transparent text-game-text placeholder-game-text-muted/50 outline-none text-sm"
          />
          <kbd className="hidden sm:inline-block rounded border border-game-border bg-game-surface-alt px-1.5 py-0.5 text-[10px] text-game-text-muted">ESC</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query.length >= 1 && results.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-game-text-muted">
              {t(locale, '未找到相关结果', 'No results found')}
            </div>
          )}
          {results.map((r) => (
            <a
              key={r.id}
              href={`/${lang}${r.url}`}
              onClick={onClose}
              className="block rounded-lg px-4 py-3 transition-colors hover:bg-game-surface-alt"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-game-text">{r.name}</span>
                <span className="rounded bg-game-primary/10 px-1.5 py-0.5 text-[10px] text-game-primary">
                  {GAME_NAMES[r.gameId]?.[locale] ?? r.gameId}
                </span>
                <span className="rounded bg-game-surface-alt px-1.5 py-0.5 text-[10px] text-game-text-muted">
                  {t(locale, '角色', 'Character')}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-game-text-muted">{r.nameAlt}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
