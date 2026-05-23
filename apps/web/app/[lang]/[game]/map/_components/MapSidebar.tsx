'use client';

import { useState } from 'react';
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
}

function getCatName(cat: SidebarCategory, locale: SupportedLocale): string {
  if (locale === 'zh') return cat.name;
  if (locale === 'ja') return cat.nameJa || cat.nameEn;
  return cat.nameEn || cat.name;
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
}: MapSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const allActive = activeCategories.size === categories.length;

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="lg:hidden absolute top-3 right-3 z-[1001] bg-black/80 backdrop-blur-sm rounded-lg p-2 text-white"
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
          flex-col w-full lg:w-72 bg-game-surface border-r border-game-border
          lg:relative absolute inset-x-0 bottom-0 top-0 z-[1000] lg:z-auto
        `}
      >
        {/* Search */}
        <div className="p-3 border-b border-game-border">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={
              locale === 'zh' ? '搜索标记...' : locale === 'ja' ? 'マーカーを検索...' : 'Search markers...'
            }
            className="w-full bg-game-bg border border-game-border rounded-lg px-3 py-2 text-sm text-game-text placeholder:text-game-text-muted focus:outline-none focus:border-game-primary"
          />
        </div>

        {/* Toggle all */}
        <div className="px-3 py-2 border-b border-game-border">
          <button
            onClick={onToggleAll}
            className={`w-full text-center text-xs py-1.5 rounded-md transition-colors ${
              allActive
                ? 'bg-game-primary/20 text-game-primary border border-game-primary/40'
                : activeCategories.size === 0
                  ? 'bg-zinc-700/50 text-zinc-400 border border-zinc-600/40'
                  : 'bg-game-primary/10 text-game-primary/70 border border-game-primary/20'
            }`}
          >
            {allActive
              ? locale === 'zh' ? '取消全选' : locale === 'ja' ? '全解除' : 'Deselect All'
              : locale === 'zh' ? '全选' : locale === 'ja' ? '全選択' : 'Select All'}
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-3 py-2 border-b border-game-border">
          <div className="flex items-center justify-between text-xs text-game-text-muted mb-1">
            <span>{locale === 'zh' ? '进度' : locale === 'ja' ? '進捗' : 'Progress'}</span>
            <span>{completedCount}/{totalMarkers}</span>
          </div>
          <div className="h-1.5 bg-game-bg rounded-full overflow-hidden">
            <div
              className="h-full bg-game-primary rounded-full transition-all duration-300"
              style={{ width: totalMarkers > 0 ? `${(completedCount / totalMarkers) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {/* Category list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {categories.map((cat) => {
            const isActive = activeCategories.has(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => onToggleCategory(cat.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-game-primary/15 text-game-text'
                    : 'text-game-text-muted hover:bg-game-surface-alt'
                }`}
              >
                <span
                  className="w-4 h-4 rounded flex items-center justify-center text-xs border transition-colors flex-shrink-0"
                  style={{
                    borderColor: isActive ? cat.color : 'rgba(255,255,255,0.15)',
                    backgroundColor: isActive ? `${cat.color}33` : 'transparent',
                  }}
                >
                  {isActive && '✓'}
                </span>
                <span className="text-base">{cat.icon}</span>
                <span className="flex-1 text-left truncate">
                  {getCatName(cat, locale)}
                </span>
                {cat.count !== undefined && (
                  <span className="text-xs text-game-text-muted tabular-nums">{cat.count}</span>
                )}
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
