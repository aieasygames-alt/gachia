import { genshinMapPath, mapImageType, MAP_JSON_LIMIT, MAP_TILE_LIMIT, publicMapError, publicMapReply, readMapBody, validMapJSON, withMapDeadline } from '../../../packages/core/genshin-map';

export function unavailableGenshinMap(request: Request) { return publicMapError(request, 503, 'Game map unavailable'); }

export async function serveGenshinMap(request: Request, game: Fetcher): Promise<Response> {
  if (!['GET', 'HEAD'].includes(request.method)) return publicMapError(request, 405, 'Method not allowed');
  const url = new URL(request.url), path = genshinMapPath(url.pathname);
  if (!path) return publicMapError(request, 404, 'Not found');
  const target = new URL(path, url.origin);
  for (const key of ['map_id', ...(path.endsWith('/points') ? ['labels'] : path.endsWith('/tile') ? ['url'] : [])]) {
    for (const value of url.searchParams.getAll(key)) target.searchParams.append(key, value);
  }
  try {
    return await withMapDeadline(async signal => {
      const response = await game.fetch(new Request(target, { method: 'GET', headers: { accept: path.endsWith('/tile') ? 'image/png,image/jpeg' : 'application/json' }, redirect: 'manual', signal }));
      const type = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
      if (!type || response.headers.has('set-cookie') || ![200, 400, 403, 405, 502, 503].includes(response.status)
        || !(response.status === 200 && path.endsWith('/tile') ? type === 'image/png' || type === 'image/jpeg' : type === 'application/json')) throw new Error('Invalid map owner response');
      const bytes = await readMapBody(response, response.status === 200 ? (path.endsWith('/tile') ? MAP_TILE_LIMIT : MAP_JSON_LIMIT) : 8192, signal);
      if (type === 'application/json') {
        const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
        if (!validMapJSON(value, path, Number(target.searchParams.get('map_id') || '2'), response.status)) throw new Error('Invalid map JSON');
      } else if (mapImageType(bytes) !== type) throw new Error('Invalid map image');
      const headers = new Headers({ 'content-type': type, 'cache-control': response.status === 200
        ? path.endsWith('/tile') ? 'public, max-age=86400' : `public, s-maxage=${path === '/api/map' ? 86400 : 21600}` : 'no-store' });
      if (request.headers.get('x-gachia-route-debug') === '1') headers.set('x-gachia-route-target', 'genshin-map');
      return publicMapReply(request, bytes, response.status, headers);
    }, 12000);
  } catch { return unavailableGenshinMap(request); }
}
