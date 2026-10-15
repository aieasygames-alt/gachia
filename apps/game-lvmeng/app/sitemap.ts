import type { MetadataRoute } from 'next';
import { contentStatus, playableCharacters } from '../lib/data';

const baseUrl = 'https://gachia.com/zh/lvmeng';

export default function sitemap(): MetadataRoute.Sitemap {
  return ['', '/guides', '/starter-guide', '/characters', '/world', '/map', '/progression', '/news', '/version', '/launch-check', '/download', '/redeem-codes', '/faq', '/roadmap', ...playableCharacters.map((character) => `/characters/${character.slug}`)].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(contentStatus.verifiedAt),
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 0.9 : 0.7,
  }));
}
