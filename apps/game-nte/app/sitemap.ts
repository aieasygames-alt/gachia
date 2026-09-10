import type { MetadataRoute } from 'next';
import { diskSets, guides, nteCharacterSummaries, nteWeapons } from '@/lib/data';

const baseUrl = 'https://gachia.com';
const locales = ['zh', 'en', 'ja'];
const pages = ['characters', 'guides', 'weapons', 'redeem-codes', 'version', 'items', 'disk-sets', 'tier-list', 'download', 'gacha', 'anomalies', 'build', 'teams', 'compare', 'calculator', 'events', 'merchant', 'map'];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    entries.push({ url: `${baseUrl}/${locale}/nte`, changeFrequency: 'weekly', priority: 0.8 });
    for (const page of pages) entries.push({ url: `${baseUrl}/${locale}/nte/${page}`, changeFrequency: 'weekly', priority: 0.6 });
    for (const character of nteCharacterSummaries) entries.push({ url: `${baseUrl}/${locale}/nte/characters/${character.id}`, changeFrequency: 'monthly', priority: 0.5 });
    for (const guide of guides) entries.push({ url: `${baseUrl}/${locale}/nte/guides/${guide.id}`, changeFrequency: 'weekly', priority: 0.5 });
    for (const weapon of nteWeapons) entries.push({ url: `${baseUrl}/${locale}/nte/weapons/${weapon.id}`, changeFrequency: 'monthly', priority: 0.5 });
    for (const diskSet of diskSets) entries.push({ url: `${baseUrl}/${locale}/nte/disk-sets/${diskSet.id}`, changeFrequency: 'monthly', priority: 0.5 });
  }
  return entries;
}
