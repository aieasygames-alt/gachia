export type TierListClientCharacter = {
  id: string;
  name: string;
  nameEn: string;
  nameJa?: string;
  image: string;
  rarity: number;
  tierRank?: string;
  element: string;
  weaponType?: string;
  path?: string;
  tierReason?: { zh?: string; en?: string };
};

const cache = new Map<string, Promise<TierListClientCharacter[]>>();

export function loadTierListClientData(game: 'genshin' | 'starrail' | 'wuwa') {
  let request = cache.get(game);
  if (!request) {
    request = fetch(`/data-client/tier-list-${game}.json`).then((response) => {
      if (!response.ok) throw new Error(`Failed to load ${game} tier list (${response.status})`);
      return response.json() as Promise<TierListClientCharacter[]>;
    });
    cache.set(game, request);
  }
  return request;
}

export function getTierListCharacterName(char: TierListClientCharacter, locale: string) {
  return locale === 'ja' && char.nameJa ? char.nameJa : locale === 'zh' ? char.name : char.nameEn;
}

export function getTierListCharacterImage(char: TierListClientCharacter) {
  return char.image;
}
