export const MATERIAL_WATCHLIST_KEY = 'gachia-genshin-material-watchlist-v1';

export function parseMaterialWatchlist(raw: string | null): string[] {
  if (!raw || raw.length > 256 * 1024) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    // Retain unknown IDs for temporarily unavailable data; never trust value types.
    return [...new Set(value.slice(0, 2000).filter((id): id is string =>
      typeof id === 'string' && id.length > 0 && id.length <= 128))];
  } catch { return []; }
}
