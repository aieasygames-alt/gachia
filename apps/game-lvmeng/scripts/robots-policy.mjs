export function blocksEntireSite(robots) {
  return /^\s*Disallow\s*:\s*\/\s*(?:#.*)?$/im.test(robots);
}

export function sitemapPathForOrigin(origin) {
  const host = new URL(origin).hostname;
  return host === 'gachia.com' || host === 'www.gachia.com'
    ? '/sitemaps/lvmeng/index.xml'
    : '/sitemap.xml';
}
