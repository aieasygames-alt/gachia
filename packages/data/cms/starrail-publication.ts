import { parseStarRailUpdate, type StarRailUpdate } from './starrail-updates';
import { STARRAIL_LOCALE_LIMIT, STARRAIL_PUBLICATION_LIMIT } from './starrail-limits';

export interface StarRailPublication {
  revision: number;
  docs: StarRailUpdate[];
}

// One complete, bounded publication. An empty list is an intentional withdrawal.
export function parseStarRailPublication(input: unknown): StarRailPublication | null {
  if (!input || typeof input !== 'object') return null;
  const value = input as Record<string, unknown>;
  if (!Number.isSafeInteger(value.revision) || Number(value.revision) <= 0 || !Array.isArray(value.docs) || value.docs.length > STARRAIL_PUBLICATION_LIMIT) return null;
  const docs = value.docs.map(parseStarRailUpdate);
  if (docs.some(doc => !doc)) return null;
  const valid = docs as StarRailUpdate[];
  if (new Set(valid.map(doc => `${doc.locale}:${doc.slug}`)).size !== valid.length) return null;
  if (['zh', 'en', 'ja'].some(locale => valid.filter(doc => doc.locale === locale).length > STARRAIL_LOCALE_LIMIT)) return null;
  return { revision: Number(value.revision), docs: valid };
}
