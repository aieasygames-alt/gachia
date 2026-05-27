'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  MapContainer,
  Marker,
  Popup,
  ZoomControl,
  useMap,
} from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import type { GameMapData, SubMapConfig } from '@gachia/data';
import { GENSHIN_SUB_MAPS } from '@gachia/data';
import type { SupportedLocale } from '@gachia/core';
import { MapSidebar } from './MapSidebar';
import { useSession } from '@/lib/auth-client';

// --- API response types ---
interface MapTileData {
  mapId: number;
  rows: number;
  cols: number;
  tileSize: number;
  totalWidth: number;
  totalHeight: number;
  tiles: string[][];
}

interface PointCategory {
  id: string;
  name: string;
  points: { id: number; x: number; y: number }[];
}

interface PointsData {
  mapId: number;
  categories: PointCategory[];
  totalPoints: number;
}

// --- Display categories (maps HoYoLAB label IDs to icons/colors) ---
const DISPLAY_CATEGORIES: { ids: number[]; icon: string; color: string; nameZh: string; nameJa: string; svg: string }[] = [
  { ids: [3], icon: '🚀', color: '#4fc3f7', nameZh: '传送锚点', nameJa: 'ワープポイント', svg: 'M12 2L8 10h3v5h2v-5h3L12 2zM8 17h8v2H8z' },
  { ids: [2], icon: '⛩️', color: '#7e57c2', nameZh: '七天神像', nameJa: '七天神像', svg: 'M12 2l-7 4v4h2v8H5v2h14v-2h-2v-8h2V6l-7-4zm-2 16H9v-8h1v8zm4 0h-1v-8h1v8z' },
  { ids: [154], icon: '🏛️', color: '#ff8a65', nameZh: '秘境', nameJa: '秘境', svg: 'M12 2L3 10v2h2v8h14v-8h2v-2L12 2zm-2 18H8v-6h2v6zm6 0h-2v-6h2v6z' },
  { ids: [5], icon: '🌬️', color: '#81c784', nameZh: '风神瞳', nameJa: '風神の瞳', svg: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm1-4c0 .55-.45 1-1 1s-1-.45-1-1 .45-1 1-1 1 .45 1 1z' },
  { ids: [6], icon: '🪨', color: '#ffb74d', nameZh: '岩神瞳', nameJa: '岩神の瞳', svg: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6zm5 4h-2v-2h2v2zm0-4h-2V7h2v6z' },
  { ids: [194], icon: '⚡', color: '#ba68c8', nameZh: '雷神瞳', nameJa: '雷神の瞳', svg: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15l-5-5h3V7h4v5h3l-5 5z' },
  { ids: [403], icon: '🌿', color: '#4caf50', nameZh: '草神瞳', nameJa: '草神の瞳', svg: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4 14H8v-2h8v2zm0-4H8v-2h8v2zm-4-4c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z' },
  { ids: [508], icon: '💧', color: '#42a5f5', nameZh: '水神瞳', nameJa: '水神の瞳', svg: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 16c-3.31 0-6-2.69-6-6s2.69-6 6-6V4l4 4-4 4V8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4h2c0 3.31-2.69 6-6 6z' },
  { ids: [626], icon: '🔥', color: '#ef5350', nameZh: '火神瞳', nameJa: '火神の瞳', svg: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2 14c0 1.1-.9 2-2 2s-2-.9-2-2 2-4 2-4 2 2.9 2 4zm-4-8c0-1.1.9-2 2-2V4l3 3-3 3V6c0 1.1-.9 2-2 2z' },
  { ids: [694], icon: '🌙', color: '#b0bec5', nameZh: '月之瞳', nameJa: 'ルノキュラス', svg: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.41 0 2.76-.29 4-.82-2.48-1.72-4.12-4.62-4.12-7.93s1.64-6.21 4.12-7.93C14.76 2.29 13.41 2 12 2z' },
  { ids: [17], icon: '📦', color: '#9e9e9e', nameZh: '普通宝箱', nameJa: '普通の宝箱', svg: 'M20 8h-3V6c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v10h20V10c0-1.1-.9-2-2-2zM9 6h6v2H9V6zm11 14H4v-7h5v3h6v-3h5v7z' },
  { ids: [44], icon: '✨', color: '#5c6bc0', nameZh: '精致宝箱', nameJa: '精緻な宝箱', svg: 'M20 8h-3V6c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v10h20V10c0-1.1-.9-2-2-2zM9 6h6v2H9V6zm5 10H10v-2h4v2z' },
  { ids: [45], icon: '💎', color: '#ab47bc', nameZh: '珍贵宝箱', nameJa: '珍贵な宝箱', svg: 'M20 8h-3V6c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v10h20V10c0-1.1-.9-2-2-2zM9 6h6v2H9V6zm3 11l-3-3h2v-2h2v2h2l-3 3z' },
  { ids: [46], icon: '👑', color: '#ffd54f', nameZh: '华丽宝箱', nameJa: '華麗な宝箱', svg: 'M20 8h-3V6c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v10h20V10c0-1.1-.9-2-2-2zM9 6h6v2H9V6zm3 12l-4-4h3v-2h2v2h3l-4 4z' },
  { ids: [269], icon: '🎁', color: '#ffab91', nameZh: '奇馈宝箱', nameJa: '奇馈の宝箱', svg: 'M20 8h-3V6c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v2l10 4 10-4v-2c0-1.1-.9-2-2-2zM9 6h6v2H9V6z' },
  { ids: [132,133,134,135,136,137,138,157,181,183,203,204,262,263,318,390,391,432,433,452,455,457,497,498,539,540,553,608,609,610,629,660,687], icon: '👹', color: '#f44336', nameZh: 'Boss', nameJa: 'ボス', svg: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 16c-3.31 0-6-2.69-6-6h2c0 2.21 1.79 4 4 4s4-1.79 4-4h2c0 3.31-2.69 6-6 6zm-3-8c-.83 0-1.5-.67-1.5-1.5S8.17 7 9 7s1.5.67 1.5 1.5S9.83 10 9 10zm6 0c-.83 0-1.5-.67-1.5-1.5S14.17 7 15 7s1.5.67 1.5 1.5S15.83 10 15 10z' },
  { ids: [29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,185,196,197,198,199,200,227,228,384,385,386,387,400,401,402,413,492,500,501,502,503,519,611,613,614,615,616,617,620,621], icon: '🌸', color: '#66bb6a', nameZh: '特产材料', nameJa: '特産素材', svg: 'M12 22c4.97 0 9-4.03 9-9-4.97 0-9 4.03-9 9zM5.6 10.25c0 1.38 1.12 2.5 2.5 2.5.53 0 1.01-.16 1.42-.44l-.02.19c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5l-.02-.19c.4.28.89.44 1.42.44 1.38 0 2.5-1.12 2.5-2.5 0-1-.59-1.85-1.43-2.25.84-.4 1.43-1.25 1.43-2.25 0-1.38-1.12-2.5-2.5-2.5-.53 0-1.01.16-1.42.44l.02-.19C14.5 2.12 13.38 1 12 1S9.5 2.12 9.5 3.5l.02.19c-.4-.28-.89-.44-1.42-.44-1.38 0-2.5 1.12-2.5 2.5 0 1 .59 1.85 1.43 2.25-.84.4-1.43 1.25-1.43 2.25z' },
];

// Build reverse lookup: label_id -> display category index
const LABEL_TO_DISPLAY = new Map<number, number>();
DISPLAY_CATEGORIES.forEach((cat, idx) => {
  cat.ids.forEach((id) => LABEL_TO_DISPLAY.set(id, idx));
});

// --- Custom icon factory ---
function createCategoryIcon(svgPath: string, color: string): L.DivIcon {
  return L.divIcon({
    html: `<div style="
      background: ${color};
      width: 28px; height: 28px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      border: 2px solid rgba(255,255,255,0.8);
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    "><svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="${svgPath}"/></svg></div>`,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

// --- Cluster icon ---
function createClusterIcon(cluster: any) {
  const count = cluster.getChildCount();
  return L.divIcon({
    html: `<div style="
      background: rgba(30, 30, 50, 0.9);
      color: #fff;
      width: 36px; height: 36px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: bold;
      border: 2px solid rgba(255,255,255,0.3);
      box-shadow: 0 2px 8px rgba(0,0,0,0.5);
    ">${count}</div>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

// --- Progress storage ---
function getProgressKey(mapId: string): string {
  return `gachia:map-progress:${mapId}`;
}

function loadProgress(mapId: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(getProgressKey(mapId));
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* ignore */ }
  return new Set();
}

function saveProgress(mapId: string, progress: Set<string>) {
  try {
    localStorage.setItem(getProgressKey(mapId), JSON.stringify([...progress]));
  } catch { /* ignore */ }
}

// --- Map initializer ---
function MapInitializer({ tileData, bounds }: { tileData: MapTileData | null; bounds: L.LatLngBoundsExpression }) {
  const map = useMap();
  const overlaysRef = useRef<L.ImageOverlay[]>([]);

  // Fit bounds and invalidate size when bounds change
  useEffect(() => {
    map.invalidateSize();
    map.fitBounds(bounds);
  }, [map, bounds]);

  useEffect(() => {
    // Remove old overlays
    for (const ov of overlaysRef.current) {
      map.removeLayer(ov);
    }
    overlaysRef.current = [];

    if (!tileData) return;

    const { rows, cols, tileSize, tiles, totalHeight, mapId: mId } = tileData;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const rawUrl = tiles[r]?.[c];
        if (!rawUrl) continue;
        // Proxy through R2 cache for reliability
        const url = `/api/map/tile?url=${encodeURIComponent(rawUrl)}&map_id=${mId}`;
        // Flip Y: row 0 (top of game map) should be at high lat (top of screen in CRS.Simple)
        const north = totalHeight - r * tileSize;
        const south = totalHeight - (r + 1) * tileSize;
        const west = c * tileSize;
        const east = (c + 1) * tileSize;
        const overlay = L.imageOverlay(url, L.latLngBounds([south, west], [north, east]), { opacity: 1 }).addTo(map);
        overlaysRef.current.push(overlay);
      }
    }
  }, [map, tileData]);

  return null;
}

// --- Convert game coords to Leaflet coords ---
function gameToLeaflet(
  gameX: number, gameY: number,
  tileData: MapTileData | null,
  subMap: SubMapConfig,
): [number, number] {
  if (!tileData) return [0, 0];

  const lng2 = gameX - subMap.coordMinX;
  const lat2 = gameY - subMap.coordMinY;

  const scaleX = tileData.totalWidth / subMap.coordRangeX;
  const scaleY = tileData.totalHeight / subMap.coordRangeY;
  const scale = Math.min(scaleX, scaleY);

  const offsetX = (tileData.totalWidth - subMap.coordRangeX * scale) / 2;
  const offsetY = (tileData.totalHeight - subMap.coordRangeY * scale) / 2;

  return [
    tileData.totalHeight - (lat2 * scale + offsetY), // lat (flipped: row 0 at top = high lat)
    lng2 * scale + offsetX, // lng (horizontal, increases east)
  ];
}

// --- Props ---
interface InteractiveMapProps {
  mapData: GameMapData;
  locale: SupportedLocale;
}

export function InteractiveMap({ mapData, locale }: InteractiveMapProps) {
  const { mapId } = mapData;

  const [tileData, setTileData] = useState<MapTileData | null>(null);
  const [pointsData, setPointsData] = useState<PointsData | null>(null);
  const [activeCategories, setActiveCategories] = useState<Set<number>>(
    () => new Set(DISPLAY_CATEGORIES.map((_, i) => i))
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [progress, setProgress] = useState<Set<string>>(() => loadProgress(mapId));
  const [activeSubMap, setActiveSubMap] = useState<SubMapConfig>(GENSHIN_SUB_MAPS[0]!);
  const { data: sessionData } = useSession();
  const isAuthenticated = !!sessionData?.user;

  // Sync server progress on mount / sub-map change for authenticated users
  useEffect(() => {
    if (!isAuthenticated) return;
    const mapKey = activeSubMap.id;
    fetch(`/api/map/progress?map_id=${mapKey}`)
      .then((res) => (res.ok ? res.json() : null) as Promise<{ markers: string[] } | null>)
      .then((data) => {
        if (!data?.markers) return;
        setProgress((prev) => {
          const serverSet = new Set(data.markers);
          // Union: local + server
          const merged = new Set([...prev, ...serverSet]);
          saveProgress(mapKey, merged);
          return merged;
        });
      })
      .catch(() => {});
  }, [isAuthenticated, activeSubMap]);

  // Fetch tiles when sub-map changes
  useEffect(() => {
    setTileData(null);
    fetch(`/api/map?map_id=${activeSubMap.hoyolabMapId}`)
      .then((res) => res.json() as Promise<MapTileData>)
      .then((data) => { if (data.tiles) setTileData(data); })
      .catch(() => {});
  }, [activeSubMap]);

  // Fetch points when sub-map changes
  useEffect(() => {
    setPointsData(null);
    const labels = activeSubMap.labelIds.join(',');
    fetch(`/api/map/points?map_id=${activeSubMap.hoyolabMapId}&labels=${labels}`)
      .then((res) => res.json() as Promise<PointsData>)
      .then((data) => { if (data.categories) setPointsData(data); })
      .catch(() => {});
  }, [activeSubMap]);

  // Reset progress when sub-map changes
  const handleSubMapChange = useCallback((mapId: string) => {
    const sm = GENSHIN_SUB_MAPS.find((s) => s.id === mapId);
    if (sm && sm.id !== activeSubMap.id) {
      setActiveSubMap(sm);
      setProgress(loadProgress(mapId));
    }
  }, [activeSubMap]);

  // Map bounds
  const mapBounds = useMemo((): L.LatLngBoundsExpression => {
    if (tileData) return L.latLngBounds([0, 0], [tileData.totalHeight, tileData.totalWidth]);
    return L.latLngBounds([0, 0], [22528, 22528]);
  }, [tileData]);

  // Icon cache
  const iconCache = useMemo(() => {
    return DISPLAY_CATEGORIES.map((cat) => createCategoryIcon(cat.svg, cat.color));
  }, []);

  // Flatten all API points into display-category-indexed markers
  const allMarkers = useMemo(() => {
    if (!pointsData) return [];

    const result: { id: string; catIdx: number; name: string; x: number; y: number }[] = [];

    for (const cat of pointsData.categories) {
      const labelId = Number(cat.id);
      const displayIdx = LABEL_TO_DISPLAY.get(labelId);
      if (displayIdx === undefined) continue;

      for (const pt of cat.points) {
        result.push({
          id: `p_${pt.id}`,
          catIdx: displayIdx,
          name: cat.name,
          x: pt.x,
          y: pt.y,
        });
      }
    }

    return result;
  }, [pointsData]);

  // Filter markers
  const filteredMarkers = useMemo(() => {
    let result = allMarkers.filter((m) => activeCategories.has(m.catIdx));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((m) => m.name.toLowerCase().includes(q));
    }

    return result;
  }, [allMarkers, activeCategories, searchQuery]);

  // Sidebar category data with counts
  const sidebarCategories = useMemo(() => {
    // Count points per display category
    const counts = new Map<number, number>();
    for (const m of allMarkers) {
      counts.set(m.catIdx, (counts.get(m.catIdx) ?? 0) + 1);
    }

    return DISPLAY_CATEGORIES.map((cat, idx) => ({
      idx,
      nameEn: cat.nameZh, // HoYoLAB returns English names from en-us endpoint
      nameZh: cat.nameZh,
      nameJa: cat.nameJa,
      icon: cat.icon,
      color: cat.color,
      count: counts.get(idx) ?? 0,
    })).filter((c) => c.count > 0);
  }, [allMarkers]);

  const toggleCategory = useCallback((catIdx: number) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catIdx)) next.delete(catIdx);
      else next.add(catIdx);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setActiveCategories((prev) => {
      if (prev.size === DISPLAY_CATEGORIES.length) return new Set();
      return new Set(DISPLAY_CATEGORIES.map((_, i) => i));
    });
  }, []);

  const toggleProgress = useCallback((markerId: string) => {
    setProgress((prev) => {
      const next = new Set(prev);
      if (next.has(markerId)) next.delete(markerId);
      else next.add(markerId);
      saveProgress(mapId, next);
      // Fire-and-forget sync for authenticated users
      if (isAuthenticated) {
        fetch('/api/map/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mapId, markerId }),
        }).catch(() => {});
      }
      return next;
    });
  }, [mapId, isAuthenticated]);

  const totalMarkers = filteredMarkers.length;
  const completedCount = filteredMarkers.filter((m) => progress.has(m.id)).length;

  const loading = !tileData || !pointsData;

  return (
    <div className="fixed inset-0 z-40 flex" style={{ top: 0 }}>
      {/* Map fills entire viewport */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 z-[1001] flex items-center justify-center" style={{ background: '#0a0a1a' }}>
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-game-primary border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-sm text-zinc-400">
                {locale === 'zh' ? '加载地图数据...' : locale === 'ja' ? '地図データを読み込み中...' : 'Loading map data...'}
              </p>
            </div>
          </div>
        )}

        <MapContainer
          center={[10240, 11264]}
          zoom={2}
          minZoom={1}
          maxZoom={6}
          crs={L.CRS.Simple}
          maxBounds={mapBounds}
          maxBoundsViscosity={1.0}
          zoomControl={false}
          attributionControl={false}
          className="w-full h-full"
          style={{ background: '#0a0a1a' }}
        >
          <MapInitializer tileData={tileData} bounds={mapBounds} />
          <ZoomControl position="bottomright" />

          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={50}
            showCoverageOnHover={false}
            spiderfyOnMaxZoom
            iconCreateFunction={createClusterIcon}
          >
            {filteredMarkers.map((marker) => {
              const [lat, lng] = gameToLeaflet(marker.x, marker.y, tileData, activeSubMap);
              return (
                <Marker
                  key={marker.id}
                  position={[lat, lng]}
                  icon={iconCache[marker.catIdx]}
                >
                  <Popup>
                    <MarkerPopupContent
                      name={marker.name}
                      icon={DISPLAY_CATEGORIES[marker.catIdx]?.icon ?? '?'}
                      isCompleted={progress.has(marker.id)}
                      locale={locale}
                      onToggleProgress={() => toggleProgress(marker.id)}
                    />
                  </Popup>
                </Marker>
              );
            })}
          </MarkerClusterGroup>
        </MapContainer>

        <div className="absolute top-3 left-3 z-[1000] bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-white pointer-events-none">
          {completedCount}/{totalMarkers} {locale === 'zh' ? '已收集' : locale === 'ja' ? '収集済み' : 'collected'}
          {pointsData && <span className="ml-2 text-zinc-400">({pointsData.totalPoints} total)</span>}
        </div>
      </div>

      {/* Sidebar floats on top of map */}
      <MapSidebar
        isAuthenticated={isAuthenticated}
        categories={sidebarCategories.map((c) => ({
          id: String(c.idx),
          name: c.nameZh,
          nameEn: c.nameEn,
          nameJa: c.nameJa,
          icon: c.icon,
          color: c.color,
          count: c.count,
        }))}
        activeCategories={new Set([...activeCategories].map(String))}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onToggleCategory={(id) => toggleCategory(Number(id))}
        onToggleAll={toggleAll}
        totalMarkers={totalMarkers}
        completedCount={completedCount}
        locale={locale}
        subMaps={GENSHIN_SUB_MAPS}
        activeMapId={activeSubMap.id}
        onSelectMap={handleSubMapChange}
      />
    </div>
  );
}

// --- Popup Content ---
function MarkerPopupContent({
  name,
  icon,
  isCompleted,
  locale,
  onToggleProgress,
}: {
  name: string;
  icon: string;
  isCompleted: boolean;
  locale: SupportedLocale;
  onToggleProgress: () => void;
}) {
  return (
    <div className="min-w-[160px]">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="font-semibold text-sm">{name}</span>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onToggleProgress(); }}
        className={`w-full text-center text-xs py-1.5 rounded-md transition-colors ${
          isCompleted
            ? 'bg-green-600/20 text-green-400 border border-green-600/40'
            : 'bg-zinc-700/50 text-zinc-300 border border-zinc-600/40 hover:bg-zinc-600/50'
        }`}
      >
        {isCompleted
          ? locale === 'zh' ? '✓ 已收集' : locale === 'ja' ? '✓ 収集済み' : '✓ Collected'
          : locale === 'zh' ? '标记为已收集' : locale === 'ja' ? '収集済みにする' : 'Mark as Collected'}
      </button>
    </div>
  );
}
