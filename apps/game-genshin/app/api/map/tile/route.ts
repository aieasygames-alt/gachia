import { servePublicMap } from '@/lib/map-public';

export const dynamic = 'force-dynamic';
export { servePublicMap as GET, servePublicMap as HEAD, servePublicMap as POST, servePublicMap as PUT,
  servePublicMap as PATCH, servePublicMap as DELETE, servePublicMap as OPTIONS };
