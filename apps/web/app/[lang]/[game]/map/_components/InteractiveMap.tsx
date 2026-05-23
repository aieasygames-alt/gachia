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
import type { MapCategory, MapMarker, GameMapData } from '@gachia/data';
import { getCategoryName, getMarkerName } from '@gachia/data';
import type { SupportedLocale } from '@gachia/core';
import { MapSidebar } from './MapSidebar';

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
const DISPLAY_CATEGORIES: { ids: number[]; icon: string; color: string; nameZh: string; nameJa: string }[] = [
  { ids: [3], icon: '🚀', color: '#4fc3f7', nameZh: '传送锚点', nameJa: 'ワープポイント' },
  { ids: [2], icon: '⛩️', color: '#7e57c2', nameZh: '七天神像', nameJa: '七天神像' },
  { ids: [154], icon: '🏛️', color: '#ff8a65', nameZh: '秘境', nameJa: '秘境' },
  { ids: [5], icon: '🌬️', color: '#81c784', nameZh: '风神瞳', nameJa: '風神の瞳' },
  { ids: [6], icon: '🪨', color: '#ffb74d', nameZh: '岩神瞳', nameJa: '岩神の瞳' },
  { ids: [194], icon: '⚡', color: '#ba68c8', nameZh: '雷神瞳', nameJa: '雷神の瞳' },
  { ids: [403], icon: '🌿', color: '#4caf50', nameZh: '草神瞳', nameJa: '草神の瞳' },
  { ids: [508], icon: '💧', color: '#42a5f5', nameZh: '水神瞳', nameJa: '水神の瞳' },
  { ids: [626], icon: '🔥', color: '#ef5350', nameZh: '火神瞳', nameJa: '火神の瞳' },
  { ids: [694], icon: '🌙', color: '#b0bec5', nameZh: '月之瞳', nameJa: 'ルノキュラス' },
  { ids: [17], icon: '📦', color: '#9e9e9e', nameZh: '普通宝箱', nameJa: '普通の宝箱' },
  { ids: [44], icon: '✨', color: '#5c6bc0', nameZh: '精致宝箱', nameJa: '精緻な宝箱' },
  { ids: [45], icon: '💎', color: '#ab47bc', nameZh: '珍贵宝箱', nameJa: '珍贵な宝箱' },
  { ids: [46], icon: '👑', color: '#ffd54f', nameZh: '华丽宝箱', nameJa: '華麗な宝箱' },
  { ids: [269], icon: '🎁', color: '#ffab91', nameZh: '奇馈宝箱', nameJa: '奇馈の宝箱' },
  { ids: [132,133,134,135,136,137,138,157,181,183,203,204,262,263,318,390,391,432,433,452,455,457,497,498,539,540,553,608,609,610,629,660,687], icon: '👹', color: '#f44336', nameZh: 'Boss', nameJa: 'ボス' },
  { ids: [29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,185,196,197,198,199,200,227,228,384,385,386,387,400,401,402,413,492,500,501,502,503,519,611,613,614,615,616,617,620,621], icon: '🌸', color: '#66bb6a', nameZh: '特产材料', nameJa: '特産素材' },
];

// Build reverse lookup: label_id -> display category index
const LABEL_TO_DISPLAY = new Map<number, number>();
DISPLAY_CATEGORIES.forEach((cat, idx) => {
  cat.ids.forEach((id) => LABEL_TO_DISPLAY.set(id, idx));
});

// --- Custom icon factory ---
function createCategoryIcon(icon: string, color: string): L.DivIcon {
  return L.divIcon({
    html: `<div style="
      background: ${color};
      width: 28px; height: 28px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px;
      border: 2px solid rgba(255,255,255,0.8);
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    ">${icon}</div>`,
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
  const tilesAdded = useRef(false);

  useEffect(() => {
    map.fitBounds(bounds);
  }, [map, bounds]);

  useEffect(() => {
    if (!tileData || tilesAdded.current) return;
    tilesAdded.current = true;

    const { rows, cols, tileSize, tiles } = tileData;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const url = tiles[r]?.[c];
        if (!url) continue;
        const south = (r + 1) * tileSize;
        const north = r * tileSize;
        const west = c * tileSize;
        const east = (c + 1) * tileSize;
        L.imageOverlay(url, L.latLngBounds([south, west], [north, east]), { opacity: 1 }).addTo(map);
      }
    }
  }, [map, tileData]);

  return null;
}

// --- Convert game coords to Leaflet coords ---
// HoYoLAB coords: x range ~-16119 to 4227, y range ~-4105 to 9115
// Map image: 22528 x 20480, origin at top-left
function gameToLeaflet(gameX: number, gameY: number, tileData: MapTileData | null): [number, number] {
  if (!tileData) return [0, 0];
  // HoYoLAB coordinate origin and transformation
  // origin = [12524, 7406] (from map detail), but we need to figure the offset
  // The map detail says origin at game coord [12524, 7406]
  // Our Leaflet map has (0,0) at top-left
  // So: leaflet_x = origin_x - gameX (flipped), leaflet_y = origin_y - gameY (but y is also inverted)
  // Actually for CRS.Simple: lat goes south, lng goes east
  // Based on tile grid: totalWidth=22528 (11 cols * 2048), totalHeight=20480 (10 rows * 2048)
  // The game coordinate system origin is at top-left of the map image
  // leaflet_lat = gameY offset from top (needs to be positive going down)
  // leaflet_lng = gameX offset from left (needs to be positive going right)

  // After analyzing actual data ranges:
  // x_pos range: -16119 to 4227 -> center around -6000
  // y_pos range: -4105 to 9115 -> center around 2500
  // Map origin in HoYoLAB: 12524 (x), 7406 (y)
  // So leaflet coords = (origin - gameCoord) for x, and (origin - gameCoord) for y
  const originX = 12524;
  const originY = 7406;
  const lat = originY - gameY; // positive = south in Leaflet
  const lng = originX - gameX; // positive = east... but we need to check

  // Actually CRS.Simple uses [lat, lng] where lat increases downward
  // The map tiles are laid out with row 0 at top
  // Game coords: positive X is east, positive Y is south
  // Leaflet: positive lat is south, positive lng is east
  // So: leaflet_lat = gameY + offsetY, leaflet_lng = gameX + offsetX
  // The origin offsets center the game coords onto the tile image

  // Simpler approach: normalize to tile space
  // gameX range: -16119 to 4227, center at ~-5946, range ~20346
  // gameY range: -4105 to 9115, center at ~2505, range ~13220
  // Map width: 22528, height: 20480
  // offsetX = (mapWidth - gameXrange) / 2 = (22528 - 20346) / 2 ≈ 1091
  // offsetY = (mapHeight - gameYrange) / 2 = (20480 - 13220) / 2 ≈ 3630

  const minX = -16119;
  const minY = -4105;
  const lng2 = gameX - minX;  // 0 to ~20346
  const lat2 = gameY - minY;  // 0 to ~13220

  // Scale to fit map with some padding
  const scaleX = tileData.totalWidth / 20346;
  const scaleY = tileData.totalHeight / 13220;
  const scale = Math.min(scaleX, scaleY);

  const offsetX = (tileData.totalWidth - 20346 * scale) / 2;
  const offsetY = (tileData.totalHeight - 13220 * scale) / 2;

  return [
    lat2 * scale + offsetY, // lat (vertical, increases south)
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

  // Fetch tiles
  useEffect(() => {
    fetch('/api/map?map_id=2')
      .then((res) => res.json() as Promise<MapTileData>)
      .then((data) => { if (data.tiles) setTileData(data); })
      .catch(() => {});
  }, []);

  // Fetch points
  useEffect(() => {
    fetch('/api/map/points?map_id=2')
      .then((res) => res.json() as Promise<PointsData>)
      .then((data) => { if (data.categories) setPointsData(data); })
      .catch(() => {});
  }, []);

  // Map bounds
  const mapBounds = useMemo((): L.LatLngBoundsExpression => {
    if (tileData) return L.latLngBounds([0, 0], [tileData.totalHeight, tileData.totalWidth]);
    return L.latLngBounds([0, 0], [22528, 22528]);
  }, [tileData]);

  // Icon cache
  const iconCache = useMemo(() => {
    return DISPLAY_CATEGORIES.map((cat) => createCategoryIcon(cat.icon, cat.color));
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
      return next;
    });
  }, [mapId]);

  const totalMarkers = filteredMarkers.length;
  const completedCount = filteredMarkers.filter((m) => progress.has(m.id)).length;

  const loading = !tileData || !pointsData;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100dvh-8rem)] min-h-[500px] relative">
      <MapSidebar
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
      />

      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 z-[1001] flex items-center justify-center bg-game-surface">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-game-primary border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-sm text-game-text-muted">
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
              const [lat, lng] = gameToLeaflet(marker.x, marker.y, tileData);
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

        <div className="absolute top-3 left-3 z-[1000] bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-white">
          {completedCount}/{totalMarkers} {locale === 'zh' ? '已收集' : locale === 'ja' ? '収集済み' : 'collected'}
          {pointsData && <span className="ml-2 text-game-text-muted">({pointsData.totalPoints} total)</span>}
        </div>
      </div>
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
