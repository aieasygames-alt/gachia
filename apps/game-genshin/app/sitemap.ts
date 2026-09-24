import type { MetadataRoute } from 'next';
import { artifactSets, genshinCharacterSummaries, genshinGuides, genshinMaterials, genshinWeapons } from '@/lib/data';

const baseUrl = 'https://gachia.com';
const locales = ['zh', 'en', 'ja'];
const pages = ['characters', 'weapons', 'artifacts', 'items', 'guides', 'redeem-codes', 'version', 'gacha', 'build', 'teams', 'tier-list', 'compare', 'calculator', 'map', 'download'];

export default function sitemap(): MetadataRoute.Sitemap {
  return locales.flatMap((locale) => [
    { url: `${baseUrl}/${locale}/genshin`, changeFrequency: 'weekly' as const, priority: 0.8 },
    ...pages.map((page) => ({ url: `${baseUrl}/${locale}/genshin/${page}`, changeFrequency: 'weekly' as const, priority: 0.6 })),
    ...genshinCharacterSummaries.map((entry) => ({ url: `${baseUrl}/${locale}/genshin/characters/${entry.id}`, changeFrequency: 'monthly' as const, priority: 0.5 })),
    ...genshinWeapons.map((entry) => ({ url: `${baseUrl}/${locale}/genshin/weapons/${entry.id}`, changeFrequency: 'monthly' as const, priority: 0.5 })),
    ...artifactSets.map((entry) => ({ url: `${baseUrl}/${locale}/genshin/artifacts/${entry.id}`, changeFrequency: 'monthly' as const, priority: 0.5 })),
    ...genshinMaterials.map((entry) => ({ url: `${baseUrl}/${locale}/genshin/items/${entry.id}`, changeFrequency: 'monthly' as const, priority: 0.5 })),
    ...genshinGuides.map((entry) => ({ url: `${baseUrl}/${locale}/genshin/guides/${entry.id}`, changeFrequency: 'weekly' as const, priority: 0.5 })),
  ]);
}
