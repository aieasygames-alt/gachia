import { shadowAuxiliaryResponse } from '../../../../../../packages/core/shadow-local-reader';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET(request: Request, { params }: { params: Promise<{ releaseKey: string; mediaKey?: string }> }) {
  const { releaseKey, mediaKey } = await params;
  return shadowAuxiliaryResponse('main', request, releaseKey, 'sitemap', mediaKey);
}
