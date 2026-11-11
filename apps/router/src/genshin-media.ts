import { readMapBody as readBoundedBody, withMapDeadline as withReadDeadline } from '../../../packages/core/genshin-map';

const IMAGE_TYPE = 'image/webp';
const MAX_IMAGE_BYTES = 512 * 1024;

export function isGenshinMediaPath(path: string) {
  return path === '/images/og/genshin.webp'
    || /^\/images\/genshin\/characters\/[a-z0-9]+(?:-[a-z0-9]+)*\.webp$/.test(path)
    || /^\/images\/articles\/genshin\/\d+\.webp$/.test(path);
}

function reply(request: Request, status: number, bytes?: Uint8Array<ArrayBuffer>) {
  const headers = new Headers({ 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  if (request.headers.get('x-gachia-route-debug') === '1') headers.set('x-gachia-route-target', 'genshin-media');
  if (status === 405) headers.set('allow', 'GET, HEAD');
  if (bytes) {
    headers.set('content-type', IMAGE_TYPE);
    headers.set('content-length', String(bytes.byteLength));
  }
  return new Response(request.method === 'HEAD' ? null : bytes, { status, headers });
}

function hasWebPHeader(bytes: Uint8Array) {
  if (bytes.byteLength < 20) return false;
  const tag = (offset: number) => String.fromCharCode(...bytes.subarray(offset, offset + 4));
  return tag(0) === 'RIFF' && tag(8) === 'WEBP' && ['VP8 ', 'VP8L', 'VP8X'].includes(tag(12))
    && new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4, true) + 8 === bytes.byteLength;
}

export async function serveGenshinMedia(request: Request, owner?: Fetcher): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return reply(request, 405);
  if (!owner) return reply(request, 503);

  const url = new URL(request.url);
  url.search = '';
  try {
    return await withReadDeadline(async signal => {
      // Use the same validated representation for GET and HEAD; do not forward credentials or validators.
      const response = await owner.fetch(new Request(url, { headers: { accept: IMAGE_TYPE }, redirect: 'manual', signal }));
      const type = response.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase();
      if (response.status !== 200 || response.headers.has('set-cookie') || type !== IMAGE_TYPE) {
        void response.body?.cancel().catch(() => {});
        return reply(request, response.status === 404 && !response.headers.has('set-cookie') ? 404 : 503);
      }
      const bytes = await readBoundedBody(response, MAX_IMAGE_BYTES, signal);
      const length = response.headers.get('content-length');
      if (!hasWebPHeader(bytes) || (length !== null && Number(length) !== bytes.byteLength)) return reply(request, 503);
      return reply(request, 200, bytes);
    }, 5000);
  } catch {
    return reply(request, 503);
  }
}
