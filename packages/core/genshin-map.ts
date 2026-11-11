export const GENSHIN_MAP_PATHS = ['/api/map', '/api/map/points', '/api/map/tile'] as const;
export type GenshinMapPath = typeof GENSHIN_MAP_PATHS[number];
export const MAP_JSON_LIMIT = 8 * 1024 * 1024;
export const MAP_TILE_LIMIT = 8 * 1024 * 1024;
export function mapImageType(bytes: Uint8Array): 'image/png' | 'image/jpeg' | undefined {
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte)) return 'image/png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
}

const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
export function validMapJSON(value: unknown, path: GenshinMapPath, mapId: number, status: number): boolean {
  if (!object(value)) return false;
  if (status !== 200) return typeof value.error === 'string';
  if (value.mapId !== mapId) return false;
  if (path === '/api/map') return typeof value.name === 'string' && integer(value.rows) && value.rows > 0 && value.rows <= 64
    && integer(value.cols) && value.cols > 0 && value.cols <= 64 && value.tileSize === 2048
    && value.totalWidth === value.cols * 2048 && value.totalHeight === value.rows * 2048
    && Array.isArray(value.tiles) && value.tiles.length === value.rows
    && value.tiles.every(row => Array.isArray(row) && row.length === value.cols && row.every(url => typeof url === 'string'));
  if (path !== '/api/map/points' || !Array.isArray(value.categories) || !integer(value.totalPoints)) return false;
  let total = 0;
  const categories = new Set<string>();
  for (const category of value.categories) {
    if (!object(category) || typeof category.id !== 'string' || !/^\d{1,6}$/.test(category.id) || categories.has(category.id)
      || typeof category.name !== 'string' || !Array.isArray(category.points)) return false;
    categories.add(category.id);
    for (const point of category.points) if (!object(point) || !integer(point.id) || typeof point.x !== 'number' || !Number.isFinite(point.x)
      || typeof point.y !== 'number' || !Number.isFinite(point.y)) return false;
    total += category.points.length;
  }
  return value.totalPoints === total;
}

export function genshinMapPath(path: string): GenshinMapPath | undefined {
  const normalized = path.endsWith('/') ? path.slice(0, -1) : path;
  return GENSHIN_MAP_PATHS.find(candidate => candidate === normalized);
}

export function publicMapReply(request: Request, body: BodyInit | null, status: number, headers: HeadersInit = {}) {
  const result = new Headers(headers);
  result.set('x-content-type-options', 'nosniff');
  if (status !== 200) result.set('cache-control', 'no-store');
  if (status === 405) result.set('allow', 'GET, HEAD');
  return new Response(request.method === 'HEAD' ? null : body, { status, headers: result });
}

export function publicMapError(request: Request, status: number, error: string) {
  return publicMapReply(request, JSON.stringify({ error }), status, { 'content-type': 'application/json; charset=utf-8' });
}

export async function withMapDeadline<T>(read: (signal: AbortSignal) => Promise<T>, milliseconds = 10000): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Error('Map read timed out')); }, milliseconds);
  });
  try { return await Promise.race([read(controller.signal), deadline]); }
  finally { clearTimeout(timer); controller.abort(); }
}

export async function consumeMapBody(response: Response, limit: number, signal: AbortSignal, consume: (bytes: Uint8Array) => void): Promise<void> {
  signal.throwIfAborted();
  const length = response.headers.get('content-length');
  if (length !== null && (!/^\d+$/.test(length) || !Number.isSafeInteger(Number(length)) || Number(length) > limit)) throw new Error('Invalid map length');
  if (!response.body) throw new Error('Missing map body');
  const reader = response.body.getReader();
  let abort!: () => void;
  const aborted = new Promise<never>((_resolve, reject) => { abort = () => reject(new Error('Map body aborted')); });
  signal.addEventListener('abort', abort, { once: true });
  try {
    let size = 0;
    while (true) {
      const { value, done } = await Promise.race([reader.read(), aborted]);
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new Error('Map body exceeds limit');
      consume(value);
    }
  } finally {
    signal.removeEventListener('abort', abort);
    // Do not await cancellation of a potentially teed response.
    void reader.cancel().catch(() => {}); reader.releaseLock();
  }
}

export async function readMapBody(response: Response, limit: number, signal: AbortSignal): Promise<Uint8Array<ArrayBuffer>> {
  const chunks: Uint8Array[] = [];
  let size = 0;
  await consumeMapBody(response, limit, signal, chunk => { chunks.push(chunk); size += chunk.byteLength; });
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}
