import type { MetadataRoute } from 'next';

const baseUrl = 'https://gachia.com/zh/lvmeng';

export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/guides', '/starter-guide', '/characters', '/world', '/map', '/progression', '/news', '/version', '/launch-check', '/download', '/redeem-codes', '/faq', '/roadmap'].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date('2026-09-25'),
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 0.9 : 0.7,
  }));
}
