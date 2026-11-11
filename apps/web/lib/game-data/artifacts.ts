import type { GameId, SupportedLocale } from '@gachia/core';

export interface ArtifactSetSummary {
  id: string;
  name: string;
  rarity?: number;
  type?: string;
  bonus2pc: string;
  bonus4pc?: string;
  bonus5pc?: string;
  characterNames: string[];
}

export interface ArtifactListData {
  gameId: 'genshin' | 'starrail' | 'wuwa';
  total: number;
  sections: Array<{ id: string; title: string; sets: ArtifactSetSummary[] }>;
}

export interface ArtifactDetailData extends ArtifactSetSummary {
  gameId: 'genshin' | 'starrail';
  nameAlt?: string;
  bestFor: Array<{ id: string; name: string; href: string }>;
  characters: Array<{ id: string; name: string; href: string; isBest: boolean }>;
}

export async function getArtifactListData(gameId: GameId, locale: SupportedLocale): Promise<ArtifactListData | null> {
  switch (gameId) {
    case 'starrail': {
      const [relics, characters] = await Promise.all([
        import('@gachia/data/games/starrail/relics'),
        import('@gachia/data/games/starrail/characters'),
      ]);
      const mapSet = (set: typeof relics.relicSets[number]) => ({
        id: set.id,
        name: relics.getRelicSetName(set, locale),
        type: set.type,
        bonus2pc: relics.getRelicSetDesc2pc(set, locale),
        bonus4pc: relics.getRelicSetDesc4pc(set, locale),
        characterNames: set.bestFor.slice(0, 8).map((charId) => {
          const char = characters.getStarRailCharacterById(charId);
          return char ? characters.getStarRailCharacterName(char, locale) : charId;
        }),
      });
      return {
        gameId,
        total: relics.relicSets.length,
        sections: [
          { id: 'cavern', title: locale === 'zh' ? '洞窟遗器' : locale === 'ja' ? '洞窟遺物' : 'Cavern Relics', sets: relics.getCavernRelics().map(mapSet) },
          { id: 'planar', title: locale === 'zh' ? '位面饰品' : locale === 'ja' ? '次元装飾品' : 'Planar Ornaments', sets: relics.getPlanarOrnaments().map(mapSet) },
        ].filter((section) => section.sets.length > 0),
      };
    }
    case 'wuwa': {
      const [echoes, characters] = await Promise.all([
        import('@gachia/data/games/wuwa/echoes'),
        import('@gachia/data/games/wuwa/characters'),
      ]);
      return {
        gameId,
        total: echoes.echoSets.length,
        sections: [{
          id: 'echoes',
          title: locale === 'zh' ? '声骸合鸣' : locale === 'ja' ? 'ソナタ効果' : 'Echo Sets (Sonata Effects)',
          sets: echoes.echoSets.map((set) => ({
            id: set.id,
            name: echoes.getEchoSetName(set, locale),
            bonus2pc: echoes.getEchoSetDesc2pc(set, locale),
            bonus5pc: set.bonus5pc ? echoes.getEchoSetDesc5pc(set, locale) : undefined,
            characterNames: set.bestFor.slice(0, 8).map((charId) => {
              const char = characters.getWuWaCharacterById(charId);
              return char ? characters.getWuWaCharacterName(char, locale) : charId;
            }),
          })),
        }],
      };
    }
    default:
      return null;
  }
}

export async function getArtifactsForStaticParams(gameId: GameId): Promise<Array<{ id: string }>> {
  switch (gameId) {
    case 'starrail': {
      const mod = await import('@gachia/data/games/starrail/relics');
      return mod.relicSets.map((set) => ({ id: set.id }));
    }
    default:
      return [];
  }
}

export async function getArtifactDetailData(gameId: GameId, id: string, locale: SupportedLocale): Promise<ArtifactDetailData | null> {
  switch (gameId) {
    case 'starrail': {
      const [relics, characters] = await Promise.all([
        import('@gachia/data/games/starrail/relics'),
        import('@gachia/data/games/starrail/characters'),
      ]);
      const set = relics.getRelicSetById(id);
      if (!set) return null;
      const bestFor = set.bestFor.map((charId) => {
        const char = characters.getStarRailCharacterById(charId);
        return { id: charId, name: char ? characters.getStarRailCharacterName(char, locale) : charId, href: `/starrail/characters/${charId}` };
      });
      return {
        gameId,
        id: set.id,
        name: relics.getRelicSetName(set, locale),
        type: set.type,
        bonus2pc: relics.getRelicSetDesc2pc(set, locale),
        bonus4pc: relics.getRelicSetDesc4pc(set, locale),
        characterNames: bestFor.map((char) => char.name),
        bestFor,
        characters: [],
      };
    }
    default:
      return null;
  }
}
