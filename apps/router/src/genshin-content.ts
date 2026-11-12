import contract from '../../../packages/core/genshin-content.json';
import { genshinPlatformSchema } from '../../../packages/core/genshin-platform';

const MAX_JSON_BYTES = 4 * 1024 * 1024;
const CATEGORIES = ['characters', 'weapons', 'items', 'artifacts'];
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === 'string');

export function isGenshinContentPath(path: string) {
  return path.startsWith('/data/genshin/') || path === '/data-client/tier-list-genshin.json' || path === '/data-client/genshin-platform.json'
    || /^\/data-manifest\/(?:games|search-(?:zh|en|ja))\.json$/.test(path);
}

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function validateSearch(value: unknown) {
  assert(object(value) && Object.keys(value).length > 0, 'Invalid search dataset');
  for (const [category, rows] of Object.entries(value)) {
    assert(CATEGORIES.includes(category) && Array.isArray(rows), 'Invalid search category');
    assert(rows.every(row => object(row) && typeof row.id === 'string' && typeof row.name === 'string' && typeof row.nameAlt === 'string'), 'Invalid search entry');
  }
}

export async function jsonBytes(worker: Pick<Fetcher, 'fetch'>, request: Request, path: string) {
  const url = new URL(request.url);
  url.pathname = path;
  url.search = '';
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error('Content read timed out')), 5000); });
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await Promise.race([worker.fetch(new Request(url, {
      method: 'GET', headers: { accept: 'application/json' }, redirect: 'manual', signal: AbortSignal.timeout(5000),
    })), deadline]);
    assert(response.status === 200 && !response.headers.has('set-cookie'), 'Content response unavailable');
    assert(response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() === 'application/json', 'Invalid content MIME');
    assert(Number(response.headers.get('content-length') ?? 0) <= MAX_JSON_BYTES, 'Content response too large');
    assert(response.body, 'Missing content body');
    reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await Promise.race([reader.read(), deadline]);
      if (done) break;
      size += value.length;
      assert(size <= MAX_JSON_BYTES, 'Content body exceeds limit');
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const value: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    return { bytes, value };
  } finally {
    clearTimeout(timer);
    // A cloned/teed response can keep cancellation pending until its other branch is consumed.
    if (reader) { void reader.cancel().catch(() => {}); reader.releaseLock(); }
  }
}

function reply(request: Request, body: BodyInit | null, status = 200, version?: string) {
  const headers = new Headers({ 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store',
    'x-content-type-options': 'nosniff' });
  if (version) headers.set('x-gachia-content-version', version);
  if (request.headers.get('x-gachia-route-debug') === '1') headers.set('x-gachia-route-target', 'genshin-content');
  if (status === 405) headers.set('allow', 'GET, HEAD');
  return new Response(request.method === 'HEAD' ? null : body, { status, headers });
}

export function unavailableGenshinContent(request: Request) {
  return reply(request, JSON.stringify({ error: 'Game content unavailable' }), 503);
}

export async function serveGenshinContent(request: Request, game: Fetcher, main: Fetcher): Promise<Response> {
  if (!['GET', 'HEAD'].includes(request.method)) return reply(request, JSON.stringify({ error: 'Method not allowed' }), 405);
  const path = new URL(request.url).pathname;
  try {
    if (path.startsWith('/data/genshin/')) {
      const file = path.slice('/data/genshin/'.length);
      if (!contract.rawFiles.includes(file)) return reply(request, JSON.stringify({ error: 'Not found' }), 404);
      const raw = await jsonBytes(game, request, `${contract.prefix}/data/${file}`);
      assert(Array.isArray(raw.value), 'Invalid game raw data');
      return reply(request, raw.bytes);
    }
    const fragment = path === '/data-client/tier-list-genshin.json' ? 'tier-list.json'
      : path === '/data-client/genshin-platform.json' ? 'platform.json' : path.slice('/data-manifest/'.length);
    assert(['tier-list.json', 'platform.json', 'games.json', ...contract.locales.map(locale => `search-${locale}.json`)].includes(fragment), 'Unknown content fragment');
    const { value } = await jsonBytes(game, request, `${contract.prefix}/${fragment}`);
    assert(object(value) && value.schemaVersion === 1 && value.owner === 'genshin'
      && typeof value.version === 'string' && /^[a-f0-9]{64}$/.test(value.version), 'Invalid game content envelope');
    if (fragment === 'platform.json') {
      genshinPlatformSchema.parse(value);
      return reply(request, JSON.stringify(value), 200, value.version);
    }
    if (fragment === 'tier-list.json') {
      assert(Array.isArray(value.data) && value.data.length > 0 && value.data.every(row => object(row) && typeof row.id === 'string'), 'Invalid tier list');
      return reply(request, JSON.stringify(value.data), 200, value.version);
    }
    // Merge a fresh owner fragment into the existing Main payload. Never fall back to its old game copy.
    if (fragment === 'games.json') {
      assert(object(value.data) && strings(value.data.characters), 'Invalid game manifest fragment');
      const base = (await jsonBytes(main, request, path)).value;
      assert(object(base) && base.version === 1 && object(base.games), 'Invalid Main game manifest');
      for (const entry of Object.values(base.games)) assert(object(entry) && strings(entry.characters), 'Invalid Main game entry');
      return reply(request, JSON.stringify({ ...base, games: { ...base.games, genshin: value.data } }), 200, value.version);
    }
    validateSearch(value.data);
    const base = (await jsonBytes(main, request, path)).value;
    assert(object(base) && Object.keys(base).length > 0, 'Invalid Main search manifest');
    for (const dataset of Object.values(base)) validateSearch(dataset);
    return reply(request, JSON.stringify({ ...base, genshin: value.data }), 200, value.version);
  } catch {
    return unavailableGenshinContent(request);
  }
}
