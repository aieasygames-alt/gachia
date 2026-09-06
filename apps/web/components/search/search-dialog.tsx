'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import type { SupportedLocale, GameId } from '@gachia/core';
import { isBlockedNoiseQuery } from '@/lib/keyword-governance';

interface SearchItem {
  id: string;
  gameId: GameId;
  name: string;
  nameAlt: string;
  type: 'character' | 'weapon' | 'item' | 'artifact';
  url: string;
}

type SearchType = SearchItem['type'];

function t(locale: SupportedLocale, zh: string, en: string) {
  return locale === 'zh' ? zh : locale === 'ja' ? zh : en;
}

const GAME_NAMES: Record<string, Record<string, string>> = {
  genshin: { zh: '原神', en: 'Genshin', ja: '原神' },
  starrail: { zh: '星铁', en: 'Star Rail', ja: 'スタレ' },
  wuwa: { zh: '鸣潮', en: 'WuWa', ja: '鳴潮' },
  nte: { zh: '异环', en: 'NTE', ja: 'NTE' },
  zzz: { zh: '绝区零', en: 'ZZZ', ja: 'ゼンゼロ' },
  guihuan: { zh: '归环', en: 'Guihuan', ja: '帰環' },
  ananta: { zh: '无限大', en: 'Ananta', ja: 'アナンタ' },
  endfield: { zh: '终末地', en: 'Endfield', ja: 'エンドフィールド' },
  sea: { zh: '遗忘之海', en: 'Sea of Remnants', ja: 'シー・オブ・レムナンツ' },
  skjh: { zh: '失控进化', en: 'Ashfall Evolution', ja: '失控進化' },
  aniimo: { zh: '伊莫', en: 'Aniimo', ja: 'アニモ' },
};

const TYPE_LABELS: Record<string, Record<string, string>> = {
  character: { zh: '角色', en: 'Character', ja: 'キャラ' },
  weapon: { zh: '武器', en: 'Weapon', ja: '武器' },
  item: { zh: '材料', en: 'Item', ja: '素材' },
  artifact: { zh: '套装', en: 'Set', ja: 'セット' },
};

const TYPE_ORDER: Record<SearchType, number> = {
  character: 0,
  weapon: 1,
  artifact: 2,
  item: 3,
};

type SearchDataset = {
  characters?: Array<{ id: string; name: string; nameAlt: string }>;
  weapons?: Array<{ id: string; name: string; nameAlt: string }>;
  items?: Array<{ id: string; name: string; nameAlt: string }>;
  artifacts?: Array<{ id: string; name: string; nameAlt: string }>;
};

const datasetCache = new Map<SupportedLocale, Promise<Partial<Record<string, SearchDataset>>>>();

function loadDataset(locale: SupportedLocale): Promise<Partial<Record<string, SearchDataset>>> {
  const cached = datasetCache.get(locale);
  if (cached) return cached;

  const promise = fetch(`/data-manifest/search-${locale}.json`)
    .then(async (response) => {
      if (!response.ok) throw new Error(`Search index request failed: ${response.status}`);
      return response.json() as Promise<Partial<Record<string, SearchDataset>>>;
    });
  datasetCache.set(locale, promise);
  return promise;
}

// Search data is kept in a generated static index so this client component
// never imports full game records or server-only loaders.

export function SearchDialog({ locale, open, onClose }: {
  locale: SupportedLocale;
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState<SearchItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    loadDataset(locale)
      .then((datasets) => {
        if (cancelled) return;
        const items: SearchItem[] = [];
        for (const [gameId, dataset] of Object.entries(datasets) as Array<[GameId, SearchDataset]>) {
          for (const character of dataset.characters ?? []) {
            items.push({ id: `${gameId}-char-${character.id}`, gameId, name: character.name, nameAlt: character.nameAlt, type: 'character', url: `/${gameId}/characters/${character.id}` });
          }
          for (const weapon of dataset.weapons ?? []) {
            items.push({ id: `${gameId}-weapon-${weapon.id}`, gameId, name: weapon.name, nameAlt: weapon.nameAlt, type: 'weapon', url: `/${gameId}/weapons/${weapon.id}` });
          }
          for (const item of dataset.items ?? []) {
            items.push({ id: `${gameId}-item-${item.id}`, gameId, name: item.name, nameAlt: item.nameAlt, type: 'item', url: `/${gameId}/items/${item.id}` });
          }
          for (const artifact of dataset.artifacts ?? []) {
            const artifactRoute = gameId === 'starrail' ? 'relics' : gameId === 'wuwa' ? 'echoes' : gameId === 'nte' ? 'disk-sets' : 'artifacts';
            items.push({ id: `${gameId}-artifact-${artifact.id}`, gameId, name: artifact.name, nameAlt: artifact.nameAlt, type: 'artifact', url: `/${gameId}/${artifactRoute}/${artifact.id}` });
          }
        }
        setIndex(items);
      })
      .catch((error) => {
        console.error('Failed to build search index', error);
        setIndex([]);
      });
    return () => { cancelled = true; };
  }, [open, locale]);

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
    if (!query.trim()) return [];
    if (isBlockedNoiseQuery(query)) return [];
    const q = query.toLowerCase();
    return index
      .filter((item) =>
        item.name.toLowerCase().includes(q) ||
        item.nameAlt.toLowerCase().includes(q) ||
        item.id.includes(q),
      )
      .sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type])
      .slice(0, 30);
  }, [query, index]);

  if (!open) return null;

  const lang = locale === 'ja' ? 'ja' : locale;
  const blockedNoiseQuery = isBlockedNoiseQuery(query);

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
            placeholder={t(locale, '搜索角色、武器、材料...', 'Search characters, weapons, items...')}
            className="flex-1 bg-transparent text-game-text placeholder-game-text-muted/50 outline-none text-sm"
          />
          <kbd className="hidden sm:inline-block rounded border border-game-border bg-game-surface-alt px-1.5 py-0.5 text-[10px] text-game-text-muted">ESC</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query.trim() && results.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-game-text-muted">
              {blockedNoiseQuery
                ? t(locale, '搜索只承接官方资料、攻略、角色、装备、材料和健康玩法意图。', 'Search only supports official data, guides, characters, gear, materials, and safe gameplay intent.')
                : t(locale, '未找到相关结果', 'No results found')}
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
                  {TYPE_LABELS[r.type]?.[locale] ?? r.type}
                </span>
              </div>
              {r.nameAlt && (
                <p className="mt-0.5 text-xs text-game-text-muted">{r.nameAlt}</p>
              )}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
