import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  if (process.env.LVMENG_DEPLOYMENT_MODE !== 'production') return { rules: { userAgent: '*', disallow: '/' } };
  return { rules: { userAgent: '*', allow: '/' }, sitemap: 'https://gachia.com/sitemaps/lvmeng/index.xml' };
}
