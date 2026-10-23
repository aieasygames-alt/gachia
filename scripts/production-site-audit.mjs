import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WEB_FEATURES } from './web-release-policy.mjs';

export const PRODUCTION_AUDIT_PATHS = [
  '/', '/zh', '/en', '/ja', '/zh/genshin', '/zh/nte', '/zh/azur-promilia',
  '/zh/games', '/sitemap.xml', '/sitemaps/nte/index.xml',
  '/sitemaps/azur-promilia/index.xml', '/robots.txt', '/ads.txt',
  '/api/auth/get-session',
  '/sitemaps/nte/index.xml?source=production-audit',
];

export async function auditProductionOwners(request = fetch) {
  const observations = [];
  const get = async (path, owner, kind) => {
    const url = new URL(path, 'https://gachia.com');
    if (url.origin !== 'https://gachia.com' || !path.startsWith('/') || path.startsWith('//')) throw Error('Cross-origin audit rejected');
    const response = await request(url, { method: 'GET', redirect: 'manual', credentials: 'omit',
      headers: { 'x-gachia-route-debug': '1' }, signal: AbortSignal.timeout(30000) });
    const body = await response.text();
    if (response.status !== 200) throw Error(`${path}: expected 200, received ${response.status}`);
    if (response.headers.get('x-gachia-route-target') !== owner) throw Error(`${path}: incorrect route owner`);
    if (kind !== 'html' && !new RegExp(kind === 'js' ? 'javascript' : kind).test(response.headers.get('content-type') ?? '')) throw Error(`${path}: wrong content type`);
    if (kind === 'html' && (!body.includes(`href="https://gachia.com${path}"`) || /noindex/i.test(response.headers.get('x-robots-tag') ?? ''))) throw Error(`${path}: public SEO contract failed`);
    if (kind === 'xml' && !body.includes(`https://gachia.com/zh/${owner}`)) throw Error(`${path}: wrong sitemap owner`);
    observations.push({ path, owner: owner ?? 'main', kind, status: response.status });
    return body;
  };
  for (const owner of [null, 'genshin', 'nte', 'azur-promilia', 'lvmeng']) {
    const path = owner ? `/zh/${owner}` : '/zh';
    const html = await get(path, owner, 'html');
    const prefix = owner ? `/_games/${owner}/_next/static/` : '/_next/static/';
    for (const extension of ['js', 'css']) {
      const assets = [...html.matchAll(/(?:src|href)="([^"?#]+\.(?:js|css))(?:[?#][^"]*)?"/g)].map(match => match[1]);
      const asset = assets.find(value => value.endsWith(`.${extension}`) && value.startsWith(prefix));
      if (!asset) throw Error(`${path}: missing owner-scoped ${extension}`);
      await get(asset, owner, extension);
    }
    if (owner) await get(`/sitemaps/${owner}/index.xml`, owner, 'xml');
  }
  return observations;
}

export async function auditProductionSite({ origin = 'https://gachia.com', accountFeatures = WEB_FEATURES.accountFeatures } = {}, request = fetch) {
  if (origin !== 'https://gachia.com') throw new Error('Production audit only permits https://gachia.com');
  if (typeof accountFeatures !== 'boolean') throw new Error('Explicit account policy required');
  const failures = [], observations = [];
  for (const path of PRODUCTION_AUDIT_PATHS) {
    const response = await request(new URL(path, origin), { method: 'GET', redirect: 'manual', credentials: 'omit', signal: AbortSignal.timeout(30000) });
    const body = await response.text();
    const expectedRedirect = path === '/' && response.status === 307 && response.headers.get('location') === '/zh';
    const disabledSession = path === '/api/auth/get-session' && !accountFeatures;
    const expectedStatus = path === '/' ? expectedRedirect : disabledSession ? response.status === 404 : response.ok;
    if (!expectedStatus) failures.push(`${path}: unexpected status ${response.status}`);
    if (disabledSession) {
      let data;
      try { data = JSON.parse(body); } catch { /* Report the invalid contract below. */ }
      if (data?.code !== 'ACCOUNT_FEATURES_DISABLED') failures.push(`${path}: missing disabled account code`);
      if (!/no-store/.test(response.headers.get('cache-control') ?? '')) failures.push(`${path}: missing no-store`);
      if (!/noindex/.test(response.headers.get('x-robots-tag') ?? '')) failures.push(`${path}: missing noindex`);
      if (response.headers.has('set-cookie')) failures.push(`${path}: unexpected cookie mutation`);
    }
    if (path.startsWith('/sitemaps/nte/index.xml') && response.headers.get('content-type')?.includes('text/html')) failures.push(`${path}: returned HTML instead of XML`);
    if (path === '/sitemaps/azur-promilia/index.xml' && response.headers.get('content-type')?.includes('text/html')) failures.push(`${path}: returned HTML instead of XML`);
    if (path.startsWith('/zh/') && !path.includes('sitemaps') && response.ok) {
      if (!/<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/gachia\.com\//i.test(body)) failures.push(`${path}: missing canonical`);
      if (!/<meta[^>]+property=["']og:title["']/i.test(body)) failures.push(`${path}: missing og:title`);
    }
    observations.push({ path, status: response.status });
  }
  return { origin, accountFeatures, observations, failures };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  auditProductionSite({ origin: process.env.SITE_ORIGIN ?? 'https://gachia.com' }).then(async result => {
    for (const observation of result.observations) console.log(`${observation.status}\t${observation.path}`);
    if (result.failures.length) { console.error(result.failures.join('\n')); process.exitCode = 1; }
    for (const observation of await auditProductionOwners()) console.log(`${observation.status}\t${observation.owner}\t${observation.path}`);
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
