'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import type { SupportedLocale, GameId } from '@gachia/core';
// Characters
import { genshinCharacters, getGenshinCharacterName } from '@gachia/data/games/genshin/characters';
import { starrailCharacters, getStarRailCharacterName } from '@gachia/data/games/starrail/characters';
import { wuwaCharacters, getWuWaCharacterName } from '@gachia/data/games/wuwa/characters';
import { nteCharacters, getNteCharacterName } from '@gachia/data/games/nte/characters';
// Weapons
import { genshinWeapons, getGenshinWeaponName } from '@gachia/data/games/genshin/weapons';
import { starrailLightCones, getStarRailLightConeName } from '@gachia/data/games/starrail/weapons';
import { wuwaWeapons, getWuWaWeaponName } from '@gachia/data/games/wuwa/weapons';
import { nteWeapons, getNteWeaponName } from '@gachia/data/games/nte/weapons';
// Items
import { genshinMaterials, getGenshinMaterialName } from '@gachia/data/games/genshin/items';
import { starrailMaterials, getStarRailMaterialName } from '@gachia/data/games/starrail/items';
import { wuwaMaterials, getWuWaMaterialName } from '@gachia/data/games/wuwa/items';
import { nteMaterials, getNteMaterialName } from '@gachia/data/games/nte/items';
// Equipment sets
import { artifactSets as genshinArtifactSets, getArtifactSetName } from '@gachia/data/games/genshin/artifacts';
import { relicSets as starrailRelicSets, getRelicSetName as getStarRailRelicSetName } from '@gachia/data/games/starrail/relics';
import { echoSets as wuwaEchoSets, getEchoSetName as getWuWaEchoSetName } from '@gachia/data/games/wuwa/echoes';
import { diskSets as nteDiskSets, getNteDiskSetName } from '@gachia/data/games/nte/extras';

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

function buildIndex(locale: SupportedLocale): SearchItem[] {
  const items: SearchItem[] = [];

  // Characters
  for (const c of genshinCharacters) {
    items.push({
      id: `genshin-char-${c.id}`, gameId: 'genshin',
      name: getGenshinCharacterName(c, locale),
      nameAlt: locale === 'zh' ? c.nameEn : c.name,
      type: 'character', url: `/genshin/characters/${c.id}`,
    });
  }
  for (const c of starrailCharacters) {
    items.push({
      id: `starrail-char-${c.id}`, gameId: 'starrail',
      name: getStarRailCharacterName(c, locale),
      nameAlt: locale === 'zh' ? c.nameEn : c.name,
      type: 'character', url: `/starrail/characters/${c.id}`,
    });
  }
  for (const c of wuwaCharacters) {
    items.push({
      id: `wuwa-char-${c.id}`, gameId: 'wuwa',
      name: getWuWaCharacterName(c, locale),
      nameAlt: locale === 'zh' ? c.nameEn : c.name,
      type: 'character', url: `/wuwa/characters/${c.id}`,
    });
  }
  for (const c of nteCharacters) {
    items.push({
      id: `nte-char-${c.id}`, gameId: 'nte',
      name: getNteCharacterName(c, locale),
      nameAlt: locale === 'zh' ? c.nameEn : c.name,
      type: 'character', url: `/nte/characters/${c.id}`,
    });
  }

  // Weapons
  for (const w of genshinWeapons) {
    items.push({
      id: `genshin-weapon-${w.id}`, gameId: 'genshin',
      name: getGenshinWeaponName(w, locale),
      nameAlt: locale === 'zh' ? w.nameEn : w.name,
      type: 'weapon', url: `/genshin/weapons/${w.id}`,
    });
  }
  for (const w of starrailLightCones) {
    items.push({
      id: `starrail-weapon-${w.id}`, gameId: 'starrail',
      name: getStarRailLightConeName(w, locale),
      nameAlt: locale === 'zh' ? w.nameEn : w.name,
      type: 'weapon', url: `/starrail/weapons/${w.id}`,
    });
  }
  for (const w of wuwaWeapons) {
    items.push({
      id: `wuwa-weapon-${w.id}`, gameId: 'wuwa',
      name: getWuWaWeaponName(w, locale),
      nameAlt: locale === 'zh' ? w.nameEn : w.name,
      type: 'weapon', url: `/wuwa/weapons/${w.id}`,
    });
  }
  for (const w of nteWeapons) {
    items.push({
      id: `nte-weapon-${w.id}`, gameId: 'nte',
      name: getNteWeaponName(w, locale),
      nameAlt: locale === 'zh' ? (w.nameEn ?? '') : (w.name ?? ''),
      type: 'weapon', url: `/nte/weapons/${w.id}`,
    });
  }

  // Items
  for (const m of genshinMaterials) {
    items.push({
      id: `genshin-item-${m.id}`, gameId: 'genshin',
      name: getGenshinMaterialName(m, locale),
      nameAlt: locale === 'zh' ? m.nameEn : m.name,
      type: 'item', url: `/genshin/items/${m.id}`,
    });
  }
  for (const m of starrailMaterials) {
    items.push({
      id: `starrail-item-${m.id}`, gameId: 'starrail',
      name: getStarRailMaterialName(m, locale),
      nameAlt: locale === 'zh' ? m.nameEn : m.name,
      type: 'item', url: `/starrail/items/${m.id}`,
    });
  }
  for (const m of wuwaMaterials) {
    items.push({
      id: `wuwa-item-${m.id}`, gameId: 'wuwa',
      name: getWuWaMaterialName(m, locale),
      nameAlt: locale === 'zh' ? m.nameEn : m.name,
      type: 'item', url: `/wuwa/items/${m.id}`,
    });
  }
  for (const m of nteMaterials) {
    items.push({
      id: `nte-item-${m.id}`, gameId: 'nte',
      name: getNteMaterialName(m, locale),
      nameAlt: locale === 'zh' ? (m.nameEn ?? '') : (m.name ?? ''),
      type: 'item', url: `/nte/items/${m.id}`,
    });
  }

  // Equipment sets (artifacts / relics / echoes / disk sets)
  for (const s of genshinArtifactSets) {
    items.push({
      id: `genshin-artifact-${s.id}`, gameId: 'genshin',
      name: getArtifactSetName(s, locale),
      nameAlt: locale === 'zh' ? s.nameEn : s.name,
      type: 'artifact', url: `/genshin/artifacts/${s.id}`,
    });
  }
  for (const s of starrailRelicSets) {
    items.push({
      id: `starrail-artifact-${s.id}`, gameId: 'starrail',
      name: getStarRailRelicSetName(s, locale),
      nameAlt: locale === 'zh' ? s.nameEn : s.name,
      type: 'artifact', url: `/starrail/artifacts/${s.id}`,
    });
  }
  for (const s of wuwaEchoSets) {
    items.push({
      id: `wuwa-artifact-${s.id}`, gameId: 'wuwa',
      name: getWuWaEchoSetName(s, locale),
      nameAlt: locale === 'zh' ? s.nameEn : s.name,
      type: 'artifact', url: `/wuwa/echoes/${s.id}`,
    });
  }
  for (const s of nteDiskSets) {
    items.push({
      id: `nte-artifact-${s.id}`, gameId: 'nte',
      name: getNteDiskSetName(s, locale),
      nameAlt: locale === 'zh' ? (s.nameEn ?? '') : (s.name ?? ''),
      type: 'artifact', url: `/nte/disk-sets/${s.id}`,
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
    if (!query.trim()) return [];
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
