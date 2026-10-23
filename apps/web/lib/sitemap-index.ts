import { GAME_DEPLOYMENTS, type GameDeployment } from '@gachia/core';

const BASE_URL = 'https://gachia.com';
export const MAIN_SITEMAP_PATH = '/sitemaps/main/sitemap.xml';

export function getSitemapPaths(
  deployments: Record<string, GameDeployment | undefined> = GAME_DEPLOYMENTS,
): string[] {
  const paths = [MAIN_SITEMAP_PATH];
  for (const deployment of Object.values(deployments)) {
    if (deployment?.deployment !== 'game' || deployment.status !== 'live') continue;
    const path = deployment.sitemapPath;
    // Fail closed rather than publishing a live owner without a discoverable shard.
    if (!path || !/^\/sitemaps\/[a-z0-9-]+\/index\.xml$/.test(path) || paths.includes(path)) {
      throw new Error(`Invalid or duplicate live sitemap path: ${path}`);
    }
    paths.push(path);
  }
  return paths;
}

export function renderSitemapIndex(): string {
  const children = getSitemapPaths().map(path => `  <sitemap><loc>${BASE_URL}${path}</loc></sitemap>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${children.join('\n')}\n</sitemapindex>\n`;
}
