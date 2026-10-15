import type { SupportedLocale } from '@gachia/core';

type Entry = { id: string; name: string; nameAlt: string };
export type SearchDataset = Partial<Record<'characters' | 'weapons' | 'items' | 'artifacts', Entry[]>>;
const cache = new Map<SupportedLocale, Promise<Record<string, SearchDataset>>>();

export function loadSearchDataset(locale: SupportedLocale): Promise<Record<string, SearchDataset>> {
  const cached = cache.get(locale);
  if (cached) return cached;
  const promise = fetch(`/data-manifest/search-${locale}.json`, { signal: AbortSignal.timeout(15000) })
    .then(async (response) => {
      if (!response.ok) throw new Error('Search index unavailable');
      const data: unknown = await response.json();
      if (!data || typeof data !== 'object' || Array.isArray(data) || !Object.keys(data).length) throw new Error('Invalid search index');
      for (const dataset of Object.values(data)) {
        if (!dataset || typeof dataset !== 'object' || Array.isArray(dataset)) throw new Error('Invalid dataset');
        for (const key of ['characters', 'weapons', 'items', 'artifacts']) {
          const rows = (dataset as Record<string, unknown>)[key];
          if (rows !== undefined && (!Array.isArray(rows) || rows.some((row) => !row || typeof row.id !== 'string' || typeof row.name !== 'string' || typeof row.nameAlt !== 'string'))) throw new Error('Invalid search entries');
        }
      }
      return data as Record<string, SearchDataset>;
    }).catch((error: unknown) => {
      if (cache.get(locale) === promise) cache.delete(locale);
      throw error;
    });
  cache.set(locale, promise);
  return promise;
}
