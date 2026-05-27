'use client';

import type { SubMapConfig } from '@gachia/data';
import type { SupportedLocale } from '@gachia/core';

function getSubMapName(subMap: SubMapConfig, locale: SupportedLocale): string {
  if (locale === 'zh') return subMap.nameZh;
  if (locale === 'ja') return subMap.nameJa;
  return subMap.nameEn;
}

interface SubMapSelectorProps {
  subMaps: SubMapConfig[];
  activeMapId: string;
  onSelectMap: (mapId: string) => void;
  locale: SupportedLocale;
}

export function SubMapSelector({ subMaps, activeMapId, onSelectMap, locale }: SubMapSelectorProps) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-2 bg-game-surface border-b border-game-border overflow-x-auto">
      {subMaps.map((sm) => {
        const isActive = sm.id === activeMapId;
        return (
          <button
            key={sm.id}
            onClick={() => onSelectMap(sm.id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-game-primary/20 text-game-primary border border-game-primary/40'
                : 'text-game-text-muted hover:text-game-text hover:bg-game-surface-alt border border-transparent'
            }`}
          >
            {getSubMapName(sm, locale)}
          </button>
        );
      })}
    </div>
  );
}
