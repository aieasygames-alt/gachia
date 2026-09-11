const origin = process.env.SITE_ORIGIN ?? 'https://gachia.com';
const paths = [
  '/', '/zh', '/en', '/ja', '/zh/genshin', '/zh/nte', '/zh/azur-promilia',
  '/zh/games', '/sitemap.xml', '/sitemaps/nte/index.xml',
  '/sitemaps/azur-promilia/index.xml', '/robots.txt', '/ads.txt',
  '/api/auth/get-session',
];

const failures = [];
for (const path of paths) {
  const response = await fetch(new URL(path, origin), { redirect: 'manual' });
  const body = await response.text();
  const expectedRedirect = path === '/' && response.status === 307 && response.headers.get('location') === '/zh';
  const expectedStatus = path === '/' ? expectedRedirect : response.ok;
  if (!expectedStatus) failures.push(`${path}: expected ${path === '/' ? '307 -> /zh' : '2xx'}, got ${response.status}`);
  if (path === '/sitemaps/nte/index.xml' && response.headers.get('content-type')?.includes('text/html')) failures.push(`${path}: returned HTML instead of XML`);
  if (path === '/sitemaps/azur-promilia/index.xml' && response.headers.get('content-type')?.includes('text/html')) failures.push(`${path}: returned HTML instead of XML`);
  if (path.startsWith('/zh/') && !path.includes('sitemaps') && response.ok) {
    if (!/<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/gachia\.com\//i.test(body)) failures.push(`${path}: missing canonical`);
    if (!/<meta[^>]+property=["']og:title["']/i.test(body)) failures.push(`${path}: missing og:title`);
  }
  console.log(`${response.status}\t${path}`);
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}
