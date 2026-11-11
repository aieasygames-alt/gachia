import type { SupportedLocale } from '@gachia/core';
import { validMapJSON } from '@gachia/core/genshin-map';
import { GENSHIN_SUB_MAPS, genshinMapData, getCategoryName } from '@gachia/data/games/genshin/map-data';
import type { SubMapConfig } from '@gachia/data/games/genshin/map-data';

export interface MapTiles { mapId: number; name: string; rows: number; cols: number; tileSize: number; totalWidth: number; totalHeight: number; tiles: string[][] }
export interface MapPoints { mapId: number; categories: { id: string; name: string; points: { id: number; x: number; y: number }[] }[]; totalPoints: number }
export interface MapCategory { id: string; name: string; color: string; labels: number[] }
export interface MapPoint { id: string; category: string; categoryName: string; name: string; x: number; y: number; color: string }
export interface MapCatalog { maps: SubMapConfig[]; categories: MapCategory[] }

const groups: Record<string, number[]> = {
  teleporter: [3], statue: [2], domain: [154], anemoculus: [5], geoculus: [6], electroculus: [194], dendroculus: [403], hydroculus: [508], pyroculus: [626],
  'chest-common': [17], 'chest-exquisite': [44], 'chest-precious': [45], 'chest-luxurious': [46],
  boss: [132, 133, 134, 135, 136, 137, 138, 157, 181, 183, 203, 204, 262, 263, 318, 390, 391, 432, 433, 452, 455, 457, 497, 498, 539, 540, 553, 608, 609, 610, 629, 660, 687],
  material: [29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 185, 196, 197, 198, 199, 200, 227, 228, 384, 385, 386, 387, 400, 401, 402, 413, 492, 500, 501, 502, 503, 519, 611, 613, 614, 615, 616, 617, 620, 621],
};
export function mapCatalog(locale: SupportedLocale): MapCatalog {
  return { maps: GENSHIN_SUB_MAPS.map(map => ({ ...map, labelIds: [...map.labelIds] })), categories: genshinMapData.categories.map(category => ({
    id: category.id, name: getCategoryName(category, locale), color: category.color, labels: [...(groups[category.id] ?? [])],
  })) };
}
export function parseMapTiles(value: unknown, id: number): MapTiles {
  if (!validMapJSON(value, '/api/map', id, 200)) throw new Error('Invalid map metadata');
  return value as MapTiles;
}
export function parseMapPoints(value: unknown, id: number): MapPoints {
  if (!validMapJSON(value, '/api/map/points', id, 200)) throw new Error('Invalid map points');
  return value as MapPoints;
}
export function projectMapPoints(data: MapPoints, map: SubMapConfig, definitions: MapCategory[]) {
  const allowed = new Set(map.labelIds), seen = new Set<string>(), categories = new Map<string, MapCategory>(), points: MapPoint[] = [];
  for (const source of data.categories) {
    const label = Number(source.id); if (!allowed.has(label)) throw new Error('Unexpected map category');
    const known = definitions.find(category => category.labels.includes(label));
    const category = known ?? { id: `label-${source.id}`, name: source.name, color: '#319795', labels: [label] };
    categories.set(category.id, category);
    for (const point of source.points) {
      const id = `p_${point.id}`; if (seen.has(id)) throw new Error('Duplicate map point'); seen.add(id);
      points.push({ id, category: category.id, categoryName: category.name, name: source.name, x: point.x, y: point.y, color: category.color });
    }
  }
  return { points, categories: [...categories.values()] };
}
export function mapCoordinates(point: Pick<MapPoint, 'x' | 'y'>, tiles: MapTiles, map: SubMapConfig): [number, number] {
  const scale = Math.min(tiles.totalWidth / map.coordRangeX, tiles.totalHeight / map.coordRangeY);
  return [tiles.totalHeight - ((point.y - map.coordMinY) * scale + (tiles.totalHeight - map.coordRangeY * scale) / 2),
    (point.x - map.coordMinX) * scale + (tiles.totalWidth - map.coordRangeX * scale) / 2];
}
export function filterMapPoints(points: MapPoint[], active: Set<string>, query: string, progress: Set<string>, hideCollected: boolean) {
  const search = query.trim().toLocaleLowerCase();
  return points.filter(point => active.has(point.category) && (!hideCollected || !progress.has(point.id))
    && (!search || `${point.name} ${point.categoryName} ${point.id}`.toLocaleLowerCase().includes(search)));
}

interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void }
export interface MapProgress { legacy: Set<string>; added: Set<string>; removed: Set<string>; writable: boolean; error: boolean }
const markerKey = (value: unknown): value is string => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(value);
const markerArray = (value: unknown): value is string[] => Array.isArray(value) && value.length <= 100000 && value.every(markerKey);
export const progressKey = (map: string) => `gachia:map-progress:v2:${map}`;
export const emptyMapProgress = (): MapProgress => ({ legacy: new Set(), added: new Set(), removed: new Set(), writable: true, error: false });
export function readMapProgress(storage: Pick<StoragePort, 'getItem'>, map: string): MapProgress {
  const state = emptyMapProgress();
  try {
    // Old Main wrote sub-map points into teyvat too. Keep originals and scope overrides per map.
    for (const key of new Set([`gachia:map-progress:${map}`, 'gachia:map-progress:teyvat'])) {
      const raw = storage.getItem(key); if (raw === null) continue;
      if (raw.length > 2 * 1024 * 1024) throw new Error('Invalid legacy progress');
      const value: unknown = JSON.parse(raw); if (!markerArray(value)) throw new Error('Invalid legacy progress');
      for (const id of value) state.legacy.add(id);
    }
    const raw = storage.getItem(progressKey(map));
    if (raw !== null) {
      if (raw.length > 4 * 1024 * 1024) throw new Error('Invalid progress');
      const value = JSON.parse(raw);
      if (!value || value.schemaVersion !== 1 || value.map !== map || !markerArray(value.added) || !markerArray(value.removed)) throw new Error('Invalid progress');
      const removed = new Set<string>(value.removed);
      if (value.added.some((id: string) => removed.has(id))) throw new Error('Invalid progress');
      state.added = new Set(value.added); state.removed = removed;
    }
  } catch { state.error = true; state.writable = false; }
  return state;
}
export function collectedMapPoints(state: MapProgress): Set<string> { return new Set([...state.legacy, ...state.added].filter(id => !state.removed.has(id))); }
export function updateMapProgress(state: MapProgress, id: string, collected: boolean): MapProgress {
  if (!markerKey(id)) throw new Error('Invalid marker');
  const added = new Set(state.added), removed = new Set(state.removed);
  if (collected) { added.add(id); removed.delete(id); } else { removed.add(id); added.delete(id); }
  return { ...state, added, removed };
}
export function persistMapProgress(storage: StoragePort, map: string, state: MapProgress): boolean {
  if (!state.writable) return false;
  try {
    const current = readMapProgress(storage, map); if (!current.writable) return false;
    const added = [...state.added], removed = [...state.removed];
    if (!markerArray(added) || !markerArray(removed)) return false;
    storage.setItem(progressKey(map), JSON.stringify({ schemaVersion: 1, map, added, removed })); return true;
  } catch { return false; }
}
