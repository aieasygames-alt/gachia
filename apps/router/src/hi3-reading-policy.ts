const locales = ['zh', 'en', 'ja'];
const weapons = ['vermillion-liuli', 'vermillion-liuli-full-burn', 'volatile-sparkler'];
const paths = new Set(locales.flatMap(locale => {
  const directory = `/${locale}/hi3/weapons`;
  return [directory, ...weapons.map(id => `${directory}/${id}`)];
}));

// Preview-only, public reading traffic. Production and authenticated requests keep main-site ownership.
export function useHi3Reading(request: Request, settings: { previewMode?: string; enabled?: string }): boolean {
  return settings.previewMode === 'true' && settings.enabled === 'true' &&
    ['GET', 'HEAD'].includes(request.method) && !request.headers.has('cookie') &&
    !request.headers.has('authorization') && paths.has(new URL(request.url).pathname);
}
