import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const publicCrawlerRules = {
    allow: '/',
    disallow: ['/api/'],
  };

  return {
    rules: [
      {
        userAgent: '*',
        ...publicCrawlerRules,
      },
      {
        userAgent: ['GPTBot', 'ChatGPT-User', 'PerplexityBot', 'ClaudeBot', 'Google-Extended'],
        ...publicCrawlerRules,
      },
    ],
    sitemap: 'https://gachia.com/sitemap.xml',
  };
}
