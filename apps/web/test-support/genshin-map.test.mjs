import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import MapPage from '../../game-genshin/app/[lang]/genshin/map/page';
import { collectedMapPoints, emptyMapProgress, filterMapPoints, mapCatalog, mapCoordinates, parseMapPoints, parseMapTiles, persistMapProgress, progressKey, projectMapPoints, readMapProgress, updateMapProgress } from '../../game-genshin/lib/map-model';

const read = file => JSON.parse(gunzipSync(readFileSync(new URL(`./fixtures/genshin-map/${file}.gz`, import.meta.url))));
const storage = initial => {
  const values = new Map(Object.entries(initial ?? {}));
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
};
const real = new Map();
for (const map of mapCatalog('en').maps) {
  const raw = read(`points-${map.hoyolabMapId}.json`).data;
  const categories = raw.label_list.filter(label => map.labelIds.includes(label.id)).map(label => ({ id: String(label.id), name: label.name,
    points: raw.point_list.filter(point => point.label_id === label.id).map(point => ({ id: point.id, x: point.x_pos, y: point.y_pos })) })).filter(category => category.points.length);
  real.set(map.id, { mapId: map.hoyolabMapId, categories, totalPoints: categories.reduce((sum, category) => sum + category.points.length, 0) });
}
for (const locale of ['zh', 'en', 'ja']) for (const map of mapCatalog(locale).maps) it(`projects all captured ${map.id} points and categories in ${locale} without samples`, () => {
  const source = real.get(map.id), definitions = mapCatalog(locale).categories;
  const projection = projectMapPoints(parseMapPoints(source, map.hoyolabMapId), map, definitions);
  expect(projection.points).toHaveLength(source.totalPoints);
  expect(projection.points.map(point => point.id)).toEqual(source.categories.flatMap(category => category.points.map(point => `p_${point.id}`)));
  expect(new Set(projection.points.map(point => point.id)).size).toBe(source.totalPoints);
  for (const category of source.categories) {
    const projected = projection.points.filter(point => point.name === category.name);
    expect(projected.map(point => [point.x, point.y])).toEqual(category.points.map(point => [point.x, point.y]));
    expect(projection.categories.some(row => row.labels.includes(Number(category.id)))).toBe(true);
  }
  for (const point of projection.points) expect(projection.categories.some(row => row.id === point.category)).toBe(true);
  if (map.id === 'enkanomiya') expect(projection.categories.some(row => row.id.startsWith('label-'))).toBe(true);
});
it('preserves coordinate transforms and finite points for all captured maps', () => {
  for (const map of mapCatalog('en').maps) {
    const info = read(`info-${map.hoyolabMapId}.json`).data.info, slices = JSON.parse(info.detail).slices;
    const tiles = parseMapTiles({ mapId: map.hoyolabMapId, name: info.name, rows: slices.length, cols: slices[0].length, tileSize: 2048,
      totalWidth: slices[0].length * 2048, totalHeight: slices.length * 2048, tiles: slices.map(row => row.map(tile => tile.url || '')) }, map.hoyolabMapId);
    const center = mapCoordinates({ x: map.coordMinX + map.coordRangeX / 2, y: map.coordMinY + map.coordRangeY / 2 }, tiles, map);
    expect(center).toEqual([tiles.totalHeight / 2, tiles.totalWidth / 2]);
    const projection = projectMapPoints(real.get(map.id), map, mapCatalog('en').categories);
    for (const point of projection.points) expect(mapCoordinates(point, tiles, map).every(Number.isFinite)).toBe(true);
  }
});
it('filters provider and localized names, IDs, intersections, empty selection and collected points', () => {
  const catalog = mapCatalog('ja'), map = catalog.maps[1], { points, categories } = projectMapPoints(real.get(map.id), map, catalog.categories);
  const point = points[0], active = new Set(categories.map(category => category.id)), done = new Set([point.id]);
  expect(filterMapPoints(points, active, ` ${point.id.toUpperCase()} `, done, false)).toEqual([point]);
  expect(filterMapPoints(points, active, point.id, done, true)).toEqual([]);
  for (const query of [point.name, point.categoryName]) expect(filterMapPoints(points, active, query, done, false)).toContain(point);
  expect(filterMapPoints(points, new Set(), '', done, false)).toEqual([]);
  expect(filterMapPoints(points, active, 'never-a-real-point-zzzz', done, false)).toEqual([]);
});
it('rejects mismatched maps, invalid coordinates, unknown labels and duplicate point IDs', () => {
  expect(() => parseMapPoints(real.get('teyvat'), 7)).toThrow();
  expect(() => parseMapTiles({}, 2)).toThrow();
  expect(() => parseMapPoints({ mapId: 2, totalPoints: 1, categories: [{ id: '3', name: 'Point', points: [{ id: 1, x: null, y: 0 }] }] }, 2)).toThrow();
  const map = mapCatalog('en').maps[0], definitions = mapCatalog('en').categories;
  expect(() => projectMapPoints({ categories: [{ id: '999999', name: 'Unknown', points: [] }] }, map, definitions)).toThrow('Unexpected');
  expect(() => projectMapPoints({ categories: [{ id: '3', name: 'Point', points: [{ id: 1, x: 0, y: 0 }, { id: 1, x: 1, y: 1 }] }] }, map, definitions)).toThrow('Duplicate');
});
it('keeps original progress bytes and recovers old misfiled submap points using independent overrides', () => {
  const original = { 'gachia:map-progress:teyvat': '["p_1","p_2"]', 'gachia:map-progress:enkanomiya': '["p_3"]', unrelated: 'unchanged' };
  const port = storage(original), initial = readMapProgress(port, 'enkanomiya');
  expect(collectedMapPoints(initial)).toEqual(new Set(['p_1', 'p_2', 'p_3']));
  let next = updateMapProgress(initial, 'p_2', false); next = updateMapProgress(next, 'p_4', true);
  expect(persistMapProgress(port, 'enkanomiya', next)).toBe(true);
  expect(collectedMapPoints(readMapProgress(port, 'enkanomiya'))).toEqual(new Set(['p_1', 'p_3', 'p_4']));
  expect(collectedMapPoints(readMapProgress(port, 'teyvat'))).toEqual(new Set(['p_1', 'p_2']));
  for (const [key, value] of Object.entries(original)) expect(port.getItem(key)).toBe(value);
  expect(port.getItem(progressKey('chasm'))).toBe(null);
});
it('saves toggles and reloads each submap without creating or overwriting legacy keys', () => {
  const port = storage();
  for (const { id } of mapCatalog('en').maps) {
    const next = updateMapProgress(readMapProgress(port, id), 'p_100', true);
    expect(persistMapProgress(port, id, next)).toBe(true);
    expect(collectedMapPoints(readMapProgress(port, id))).toEqual(new Set(['p_100']));
    expect(persistMapProgress(port, id, updateMapProgress(next, 'p_100', false))).toBe(true);
    expect(collectedMapPoints(readMapProgress(port, id))).toEqual(new Set());
  }
  expect([...port.values.keys()].every(key => key.startsWith('gachia:map-progress:v2:'))).toBe(true);
});
it.each(['{bad', 'null', '{}', '["<script>"]', 'x'.repeat(2 * 1024 * 1024 + 1)])('keeps corrupt legacy records read-only (case %#)', raw => {
  const port = storage({ 'gachia:map-progress:teyvat': raw }), state = readMapProgress(port, 'teyvat');
  expect(state.error).toBe(true); expect(state.writable).toBe(false);
  expect(persistMapProgress(port, 'teyvat', updateMapProgress(state, 'p_1', true))).toBe(false);
  expect(port.getItem('gachia:map-progress:teyvat')).toBe(raw); expect(port.values.size).toBe(1);
});
it('protects invalid overlays, quota failures and records changed since load', () => {
  const raw = JSON.stringify({ schemaVersion: 1, map: 'wrong', added: [], removed: [] }), port = storage({ [progressKey('teyvat')]: raw });
  expect(readMapProgress(port, 'teyvat').error).toBe(true);
  expect(persistMapProgress(port, 'teyvat', updateMapProgress(emptyMapProgress(), 'p_1', true))).toBe(false);
  expect(port.getItem(progressKey('teyvat'))).toBe(raw);
  const next = updateMapProgress(emptyMapProgress(), 'p_1', true);
  expect(persistMapProgress({ getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } }, 'teyvat', next)).toBe(false);
  expect(collectedMapPoints(next)).toEqual(new Set(['p_1']));
  expect(readMapProgress({ getItem: () => { throw new Error('SecurityError'); } }, 'teyvat').writable).toBe(false);
  expect(() => updateMapProgress(next, '<script>', true)).toThrow();
});
it('validates large disjoint overlays without a quadratic intersection scan', () => {
  const values = { schemaVersion: 1, map: 'teyvat', added: Array.from({ length: 50000 }, (_, i) => `p_${i}`), removed: Array.from({ length: 50000 }, (_, i) => `p_${i + 50000}`) };
  expect(readMapProgress(storage({ [progressKey('teyvat')]: JSON.stringify(values) }), 'teyvat').error).toBe(false);
});
it('renders localized SSR controls, region/category no-JS fallback and genuine related links', async () => {
  for (const locale of ['zh', 'en', 'ja']) {
    const html = renderToStaticMarkup(await MapPage({ params: Promise.resolve({ lang: locale }) }));
    expect(html).toContain('map-tool'); expect(html).toContain('disabled=""'); expect(html).toContain('<noscript>');
    expect(html).toContain('map-fallback'); expect(html).not.toContain('data-map-point=');
    for (const path of ['characters', 'version', 'guides', 'items']) expect(html).toContain(`/${locale}/genshin/${path}`);
  }
});
