import contract from '../../../packages/core/nte-content.json';
import { ntePlatformSchema } from '../../../packages/core/nte-platform';
import { jsonBytes } from './genshin-content';

const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
function assert(value: unknown): asserts value { if (!value) throw new Error('Invalid NTE public content'); }
function search(value: unknown) {
  assert(object(value) && Object.keys(value).length > 0);
  for (const [category, rows] of Object.entries(value)) {
    assert(['characters', 'weapons', 'items', 'artifacts'].includes(category) && Array.isArray(rows));
    assert(rows.every(row => object(row) && typeof row.id === 'string' && typeof row.name === 'string' && typeof row.nameAlt === 'string'));
  }
}
function reply(request: Request, value: unknown, status = 200, version?: string, baseVersion?: string | null) {
  const headers = new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  if (version) headers.set('x-gachia-content-version', baseVersion || version);
  if (version) headers.set('x-gachia-nte-content-version', version);
  if (status === 405) headers.set('allow', 'GET, HEAD');
  if (request.headers.get('x-gachia-route-debug') === '1') headers.set('x-gachia-route-target', 'nte-content');
  return new Response(request.method === 'HEAD' ? null : JSON.stringify(value), { status, headers });
}
export function isNteContentPath(path: string) {
  return path.startsWith('/data/nte/') || path === '/data-client/nte-platform.json'
    || /^\/data-manifest\/(?:games|search-(?:zh|en|ja))\.json$/.test(path);
}
export function unavailableNteContent(request: Request) { return reply(request, { error: 'Game content unavailable' }, 503); }
export async function serveNteContent(request: Request, game: Pick<Fetcher, 'fetch'>, aggregateBase: Pick<Fetcher, 'fetch'>) {
  if (!['GET', 'HEAD'].includes(request.method)) return reply(request, { error: 'Method not allowed' }, 405);
  const path = new URL(request.url).pathname;
  try {
    if (path.startsWith('/data/nte/')) {
      const file = path.slice('/data/nte/'.length);
      if (!contract.rawFiles.includes(file)) return reply(request, { error: 'Not found' }, 404);
      const raw = await jsonBytes(game, request, `${contract.prefix}/data/${file}`);
      if (file === 'raw-gacha-system.json') assert(object(raw.value) && Array.isArray(raw.value.banners));
      else assert(Array.isArray(raw.value));
      return reply(request, raw.value);
    }
    const fragment = path === '/data-client/nte-platform.json' ? 'platform.json' : path.slice('/data-manifest/'.length);
    assert(['platform.json', 'games.json', ...contract.locales.map(locale => `search-${locale}.json`)].includes(fragment));
    const { value } = await jsonBytes(game, request, `${contract.prefix}/${fragment}`);
    assert(object(value) && value.schemaVersion === 1 && value.owner === 'nte' && typeof value.version === 'string' && /^[a-f0-9]{64}$/.test(value.version));
    if (fragment === 'platform.json') return reply(request, ntePlatformSchema.parse(value), 200, value.version);
    // The supplied base may already merge Genshin. Never overwrite that owner
    // with Main's former snapshot while adding NTE's current fragment.
    let baseVersion: string | null = null;
    const base = await jsonBytes({ fetch: async input => {
      const response = await aggregateBase.fetch(input);
      baseVersion = response.headers.get('x-gachia-content-version'); return response;
    } }, request, path);
    assert(object(base.value));
    if (fragment === 'games.json') {
      assert(base.value.version === 1 && object(base.value.games));
      assert(object(value.data) && Array.isArray(value.data.characters) && value.data.characters.every(id => typeof id === 'string'));
      for (const entry of Object.values(base.value.games)) assert(object(entry) && Array.isArray(entry.characters) && entry.characters.every(id => typeof id === 'string'));
      return reply(request, { ...base.value, games: { ...base.value.games, nte: value.data } }, 200, value.version, baseVersion);
    }
    search(value.data);
    assert(Object.keys(base.value).length > 0);
    for (const dataset of Object.values(base.value)) search(dataset);
    return reply(request, { ...base.value, nte: value.data }, 200, value.version, baseVersion);
  } catch { return unavailableNteContent(request); }
}
