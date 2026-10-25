import type { GameId } from '@gachia/core';
import type { SearchDataset } from './search-dataset';
import { isBlockedNoiseQuery } from './keyword-governance';

export type SearchItem = {
  id: string;
  gameId: GameId;
  name: string;
  nameAlt: string;
  type: 'character' | 'weapon' | 'item' | 'artifact';
  url: string;
};

const typeOrder = { character: 0, weapon: 1, artifact: 2, item: 3 };
export const SEARCH_QUERY_LIMIT = 160;

export function buildSearchItems(datasets: Record<string, SearchDataset>): SearchItem[] {
  return Object.entries(datasets).flatMap(([game, dataset]) => {
    const gameId = game as GameId;
    const artifactRoute = gameId === 'starrail' ? 'relics' : gameId === 'wuwa' ? 'echoes' : gameId === 'nte' ? 'disk-sets' : 'artifacts';
    const categories = [
      ['characters', 'character', 'characters'], ['weapons', 'weapon', 'weapons'],
      ['items', 'item', 'items'], ['artifacts', 'artifact', artifactRoute],
    ] as const;
    return categories.flatMap(([key, type, route]) => (dataset[key] ?? []).map((entry) => ({
      ...entry, id: `${gameId}-${type}-${entry.id}`, gameId, type,
      url: `/${gameId}/${route}/${encodeURIComponent(entry.id)}`,
    })));
  });
}

export function searchItems(index: SearchItem[], query: string): SearchItem[] {
  if (query.length > SEARCH_QUERY_LIMIT || isBlockedNoiseQuery(query)) return [];
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return index.filter((item) => item.name.toLowerCase().includes(q) || item.nameAlt.toLowerCase().includes(q) || item.id.includes(q))
    .sort((a, b) => typeOrder[a.type] - typeOrder[b.type]).slice(0, 30);
}
