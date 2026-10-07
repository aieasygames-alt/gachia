import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  if (process.env.NTE_DEPLOYMENT_MODE !== 'live') return { rules: { userAgent: '*', disallow: '/' } };
  return { rules: { userAgent: '*', allow: '/' }, sitemap: 'https://gachia.com/sitemaps/nte/index.xml' };
}
