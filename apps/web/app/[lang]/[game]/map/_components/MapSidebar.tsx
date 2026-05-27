'use client';

import { useState } from 'react';
import type { SubMapConfig } from '@gachia/data';
import type { SupportedLocale } from '@gachia/core';

interface SidebarCategory {
  id: string;
  name: string;
  nameEn: string;
  nameJa: string;
  icon: string;
  color: string;
  count?: number;
}

interface MapSidebarProps {
  categories: SidebarCategory[];
  activeCategories: Set<string>;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onToggleCategory: (categoryId: string) => void;
  onToggleAll: () => void;
  totalMarkers: number;
  completedCount: number;
  locale: SupportedLocale;
  isAuthenticated?: boolean;
  subMaps?: SubMapConfig[];
  activeMapId?: string;
  onSelectMap?: (mapId: string) => void;
}

function getCatName(cat: SidebarCategory, locale: SupportedLocale): string {
  if (locale === 'zh') return cat.name;
  if (locale === 'ja') return cat.nameJa || cat.nameEn;
  return cat.nameEn || cat.name;
}

function getSubMapName(subMap: SubMapConfig, locale: SupportedLocale): string {
  if (locale === 'zh') return subMap.nameZh;
  if (locale === 'ja') return subMap.nameJa;
  return subMap.nameEn;
}

export function MapSidebar({
  categories,
  activeCategories,
  searchQuery,
  onSearchChange,
  onToggleCategory,
  onToggleAll,
  totalMarkers,
  completedCount,
  locale,
  isAuthenticated,
  subMaps,
  activeMapId,
  onSelectMap,
}: MapSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const allActive = activeCategories.size === categories.length;
  const pct = totalMarkers > 0 ? Math.round((completedCount / totalMarkers) * 100) : 0;

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="lg:hidden fixed top-3 right-3 z-[1100] bg-black/80 backdrop-blur-sm rounded-lg p-2.5 text-white shadow-lg"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {collapsed ? (
            <path d="M3 12h18M3 6h18M3 18h18" />
          ) : (
            <path d="M18 6L6 18M6 6l12 12" />
          )}
        </svg>
      </button>

      {/* Sidebar panel */}
      <div
        className={`
          ${collapsed ? 'hidden lg:flex' : 'flex'}
          flex-col w-full lg:w-64 bg-black/90 backdrop-blur-md border-l border-white/10
          lg:relative fixed inset-y-0 right-0 z-[1050] lg:z-auto
        `}
      >
        {/* Sub-map selector */}
        {subMaps && onSelectMap && (
          <div className="flex gap-1 p-2 border-b border-white/10">
            {subMaps.map((sm) => {
              const isActive = sm.id === activeMapId;
              return (
                <button
                  key={sm.id}
                  onClick={() => onSelectMap(sm.id)}
                  className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-game-primary/20 text-game-primary'
                      : 'text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {getSubMapName(sm, locale)}
                </button>
              );
            })}
          </div>
        )}

        {/* Search */}
        <div className="p-2 border-b border-white/10">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={
              locale === 'zh' ? '搜索标记...' : locale === 'ja' ? 'マーカーを検索...' : 'Search markers...'
            }
            className="w-full bg-white/5 border border-white/10 rounded-md px-2.5 py-1.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-game-primary"
          />
        </div>

        {/* Progress bar + sync */}
        <div className="px-2.5 py-2 border-b border-white/10">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-zinc-400">
              {completedCount}/{totalMarkers}
              <span className="ml-1 text-game-primary font-medium">{pct}%</span>
            </span>
            {isAuthenticated && (
              <span className="text-green-400 flex items-center gap-1">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
              </span>
            )}
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-game-primary rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Toggle all */}
        <div className="px-2.5 py-1.5 border-b border-white/10">
          <button
            onClick={onToggleAll}
            className={`w-full text-center text-xs py-1 rounded transition-colors ${
              allActive
                ? 'bg-game-primary/20 text-game-primary'
                : activeCategories.size === 0
                  ? 'text-zinc-500 hover:text-zinc-300'
                  : 'bg-game-primary/10 text-game-primary/70'
            }`}
          >
            {allActive
              ? locale === 'zh' ? '取消全选' : locale === 'ja' ? '全解除' : 'Deselect All'
              : locale === 'zh' ? '全选' : locale === 'ja' ? '全選択' : 'Select All'}
          </button>
        </div>

        {/* Category list */}
        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {categories.map((cat) => {
            const isActive = activeCategories.has(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => onToggleCategory(cat.id)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? 'bg-game-primary/15 text-white'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-sm flex items-center justify-center text-[10px] border transition-colors flex-shrink-0"
                  style={{
                    borderColor: isActive ? cat.color : 'rgba(255,255,255,0.15)',
                    backgroundColor: isActive ? `${cat.color}33` : 'transparent',
                  }}
                >
                  {isActive && '✓'}
                </span>
                <span className="text-sm">{cat.icon}</span>
                <span className="flex-1 text-left truncate text-xs">
                  {getCatName(cat, locale)}
                </span>
                {cat.count !== undefined && (
                  <span className="text-[10px] text-zinc-500 tabular-nums">{cat.count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
