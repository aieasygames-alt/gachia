import type { MetadataRoute } from 'next';
import { GAME_DEPLOYMENTS } from '@gachia/core';

const BASE_URL = 'https://gachia.com';

export default function robots(): MetadataRoute.Robots {
  const publicCrawlerRules = {
    allow: '/',
    disallow: ['/api/'],
  };

  const sitemaps = [
    `${BASE_URL}/sitemap.xml`,
    ...Object.values(GAME_DEPLOYMENTS)
      .filter((deployment) => deployment?.deployment === 'game' && deployment.status === 'live' && deployment.sitemapPath)
      .map((deployment) => `${BASE_URL}${deployment!.sitemapPath}`),
  ];

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
    sitemap: sitemaps,
  };
}
