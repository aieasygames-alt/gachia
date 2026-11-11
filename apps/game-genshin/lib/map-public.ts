import { GENSHIN_SUB_MAPS } from '@gachia/data/games/genshin/map-data';
import { consumeMapBody, genshinMapPath, mapImageType, MAP_JSON_LIMIT, MAP_TILE_LIMIT, publicMapError, publicMapReply, readMapBody, withMapDeadline } from '@gachia/core/genshin-map';
import { JSONParser } from '@gachia/core/vendor/streamparser-json/index.js';

const SOURCE = 'https://sg-public-api-static.hoyolab.com/common/map_user/ys_obc/v1/map/';
const POINT_SOURCE_LIMIT = 32 * 1024 * 1024;
const DEFAULT_LABELS = new Set(GENSHIN_SUB_MAPS[0]!.labelIds);
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
function assert(value: unknown): asserts value { if (!value) throw new Error('Invalid map source'); }

export function mapTileURL(value: string): URL | undefined {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && url.hostname === 'act-webstatic.hoyoverse.com' && !url.port && !url.username && !url.password
      && !url.search && !url.hash && /^\/map_manage\/\d{8}\/[a-zA-Z0-9_-]+\.(?:png|jpe?g)$/.test(url.pathname)) return url;
  } catch {}
}

async function sourceResponse(path: string, signal: AbortSignal): Promise<Response> {
  const response = await fetch(new URL(path, SOURCE), { headers: { accept: 'application/json' }, redirect: 'manual', signal, cache: 'no-store' });
  assert(response.status === 200 && !response.headers.has('set-cookie') && response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() === 'application/json');
  return response;
}

async function sourceJSON(path: string, signal: AbortSignal): Promise<Record<string, unknown>> {
  const bytes = await readMapBody(await sourceResponse(path, signal), 1024 * 1024, signal);
  const raw: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  assert(object(raw) && (raw.retcode === undefined || raw.retcode === 0) && object(raw.data));
  return raw.data;
}

function tileGrid(data: Record<string, unknown>, mapId: number) {
  assert(object(data.info) && data.info.id === mapId && typeof data.info.name === 'string' && typeof data.info.detail === 'string');
  const detail: unknown = JSON.parse(data.info.detail);
  assert(object(detail) && Array.isArray(detail.slices) && detail.slices.length > 0 && detail.slices.length <= 64);
  const slices = detail.slices, first: unknown = slices[0];
  assert(Array.isArray(first) && first.length > 0 && first.length <= 64);
  const cols = first.length;
  const tiles = slices.map((row: unknown) => {
    assert(Array.isArray(row) && row.length === cols);
    return row.map((cell: unknown) => {
      assert(object(cell) && typeof cell.url === 'string' && (cell.url === '' || mapTileURL(cell.url)));
      return cell.url;
    });
  });
  return { mapId, name: data.info.name, rows: tiles.length, cols, tileSize: 2048, totalWidth: cols * 2048, totalHeight: tiles.length * 2048, tiles };
}

async function points(mapId: number, labels: Set<number>, signal: AbortSignal) {
  const names = new Map<number, string>();
  const categories: Record<string, { id: string; name: string; points: { id: number; x: number; y: number }[] }> = {};
  let sawPoints = false, sawLabels = false, pointCount = 0;
  const parser = new JSONParser({ paths: ['$.retcode', '$.data.point_list.*', '$.data.label_list.*', '$.data.point_list', '$.data.label_list'], keepStack: false });
  parser.onValue = ({ value, key, parent, stack }) => {
    const section = stack.at(-1)?.key;
    if (section === 'point_list') {
      assert(Array.isArray(parent) && object(value) && integer(value.id) && integer(value.label_id) && typeof value.x_pos === 'number' && Number.isFinite(value.x_pos)
        && typeof value.y_pos === 'number' && Number.isFinite(value.y_pos) && ++pointCount <= 200000);
      if (labels.has(value.label_id)) {
        const id = String(value.label_id);
        categories[id] ??= { id, name: '', points: [] };
        categories[id].points.push({ id: value.id, x: value.x_pos, y: value.y_pos });
      }
      // The container is emitted for shape validation, but never retains the raw rows.
      parent.length = 0;
    } else if (section === 'label_list') {
      assert(Array.isArray(parent) && object(value) && integer(value.id) && typeof value.name === 'string' && names.size < 20000);
      names.set(value.id, value.name); parent.length = 0;
    } else if (key === 'point_list') { assert(Array.isArray(value)); sawPoints = true; }
    else if (key === 'label_list') { assert(Array.isArray(value)); sawLabels = true; }
    else if (key === 'retcode') assert(value === 0);
  };
  // Preserve multibyte characters across arbitrary transport chunk boundaries.
  const decoder = new TextDecoder('utf-8', { fatal: true });
  await consumeMapBody(await sourceResponse(`point/list?map_id=${mapId}&app_sn=ys_obc`, signal), POINT_SOURCE_LIMIT, signal, chunk => {
    const text = decoder.decode(chunk, { stream: true });
    if (text) parser.write(text);
  });
  const tail = decoder.decode(); if (tail) parser.write(tail);
  if (!parser.isEnded) parser.end();
  assert(parser.isEnded && sawPoints && sawLabels);
  const values = Object.values(categories).filter(category => names.has(Number(category.id)));
  for (const category of values) category.name = names.get(Number(category.id))!;
  return { mapId, categories: values, totalPoints: values.reduce((sum, category) => sum + category.points.length, 0) };
}

export async function servePublicMap(request: Request): Promise<Response> {
  const url = new URL(request.url), path = genshinMapPath(url.pathname);
  if (!path) return publicMapError(request, 404, 'Not found');
  if (!['GET', 'HEAD'].includes(request.method)) return publicMapError(request, 405, 'Method not allowed');
  const mapId = url.searchParams.get('map_id') || '2';
  if (!/^[1-9]$/.test(mapId) || ['map_id', 'labels', 'url'].some(key => url.searchParams.getAll(key).length > 1)) return publicMapError(request, 400, 'Invalid map request');
  const labels = url.searchParams.get('labels');
  if (path === '/api/map/points' && labels && (labels.length > 500 || labels.split(',').length > 100 || !labels.split(',').every(id => /^\d{1,6}$/.test(id.trim())))) {
    return publicMapError(request, 400, 'Invalid labels format');
  }
  const tile = path === '/api/map/tile' ? mapTileURL(url.searchParams.get('url') ?? '') : undefined;
  if (path === '/api/map/tile' && !tile) return publicMapError(request, url.searchParams.has('url') ? 403 : 400, 'Invalid tile request');
  try {
    return await withMapDeadline(async signal => {
      if (tile) {
        const response = await fetch(tile, { headers: { 'user-agent': 'Gachia/1.0', accept: 'image/png,image/jpeg' }, redirect: 'manual', signal, cache: 'no-store' });
        const type = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
        assert(response.status === 200 && !response.headers.has('set-cookie') && (type === 'image/png' || type === 'image/jpeg'));
        const bytes = await readMapBody(response, MAP_TILE_LIMIT, signal);
        assert(mapImageType(bytes) === type);
        return publicMapReply(request, bytes, 200, { 'content-type': type, 'cache-control': 'public, max-age=86400', 'x-cache': 'BYPASS' });
      }
      const data = path === '/api/map'
        ? tileGrid(await sourceJSON(`info?map_id=${mapId}&app_sn=ys_obc&lang=en-us`, signal), Number(mapId))
        : await points(Number(mapId), labels ? new Set(labels.split(',').map(id => Number(id.trim()))) : DEFAULT_LABELS, signal);
      const bytes = new TextEncoder().encode(JSON.stringify(data));
      assert(bytes.byteLength <= MAP_JSON_LIMIT);
      return publicMapReply(request, bytes, 200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': `public, s-maxage=${path === '/api/map' ? 86400 : 21600}` });
    });
  } catch { return publicMapError(request, 502, 'Map source unavailable'); }
}
