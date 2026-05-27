'use client';

import dynamic from 'next/dynamic';
import type { GameMapData } from '@gachia/data';
import type { SupportedLocale } from '@gachia/core';

// Dynamic import with ssr: false — must be in a Client Component
const InteractiveMap = dynamic(
  () => import('./InteractiveMap').then((mod) => ({ default: mod.InteractiveMap })),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: '#0a0a1a' }}>
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-game-primary border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm text-zinc-400">
            Loading Map...
          </p>
        </div>
      </div>
    ),
  }
);

interface MapLoaderProps {
  mapData: GameMapData;
  locale: SupportedLocale;
}

export function MapLoader(props: MapLoaderProps) {
  return <InteractiveMap {...props} />;
}
