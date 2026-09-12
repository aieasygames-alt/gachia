import type { MetadataRoute } from 'next';
import { characters, guides, kibo, weapons, worldRegions } from '@/lib/data';

const baseUrl = 'https://gachia.com';
const locales = ['zh', 'en', 'ja'];

export default function sitemap(): MetadataRoute.Sitemap {
  return locales.flatMap((locale) => [
    { url: `${baseUrl}/${locale}/azur-promilia`, changeFrequency: 'weekly' as const, priority: 0.8 },
    ...['characters', 'weapons', 'guides', 'tier-list', 'redeem-codes', 'kibo', 'world', 'planner'].map((page) => ({ url: `${baseUrl}/${locale}/azur-promilia/${page}`, changeFrequency: 'weekly' as const, priority: 0.6 })),
    ...characters.map((entry) => ({ url: `${baseUrl}/${locale}/azur-promilia/characters/${entry.id}`, changeFrequency: 'monthly' as const, priority: 0.5 })),
    ...weapons.map((entry) => ({ url: `${baseUrl}/${locale}/azur-promilia/weapons/${entry.id}`, changeFrequency: 'monthly' as const, priority: 0.5 })),
    ...guides.map((entry) => ({ url: `${baseUrl}/${locale}/azur-promilia/guides/${entry.id}`, changeFrequency: 'weekly' as const, priority: 0.5 })),
    { url: `${baseUrl}/${locale}/azur-promilia/kibo`, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/${locale}/azur-promilia/world`, changeFrequency: 'monthly' as const, priority: 0.5 },
  ]);
}
