import type { SupportedLocale } from '@gachia/core';
import type { GenshinCharacter } from '@gachia/data/games/genshin/types';

export type TeamCharacter = Pick<GenshinCharacter, 'id' | 'name' | 'nameEn' | 'nameJa' | 'element' | 'rarity' | 'tierRank' | 'teamComps'> & { image: string };
export type TeamSlots = [string, string, string, string];
export type TeamRecommendation = TeamCharacter['teamComps'][number] & { key: string; sourceId: string; overlap: number };
export const emptyTeam = (): TeamSlots => ['', '', '', ''];

export function projectTeamCharacters(characters: GenshinCharacter[], image: (character: GenshinCharacter) => string): TeamCharacter[] {
  return characters.map(character => {
    const { id, name, nameEn, nameJa, element, rarity, tierRank, teamComps } = character;
    return { id, name, nameEn, nameJa, element, rarity, tierRank, teamComps, image: image(character) };
  });
}

export const teamName = (character: TeamCharacter, locale: SupportedLocale) => locale === 'zh' ? character.name : locale === 'ja' ? character.nameJa || character.nameEn : character.nameEn;
export const resolveTeamMember = (characters: TeamCharacter[], member: string) => characters.find(character => [character.id, character.name, character.nameEn, character.nameJa].includes(member));

export function filterTeamCharacters(characters: TeamCharacter[], query: string, element: string) {
  const search = query.trim().toLowerCase();
  return characters.filter(character => (element === 'all' || character.element === element)
    && (!search || [character.id, character.name, character.nameEn, character.nameJa ?? ''].some(value => value.toLowerCase().includes(search))));
}

export function setTeamSlot(team: TeamSlots, slot: number, id: string): TeamSlots {
  if (!Number.isInteger(slot) || slot < 0 || slot > 3 || (id && team.some((current, index) => index !== slot && current === id))) return [...team];
  const next: TeamSlots = [...team]; next[slot] = id; return next;
}

export function fillTeam(characters: TeamCharacter[], members: string[]): TeamSlots {
  const result = emptyTeam(), seen = new Set<string>();
  for (let index = 0; index < 4; index++) {
    const character = members[index] ? resolveTeamMember(characters, members[index]!) : undefined;
    if (character && !seen.has(character.id)) { result[index] = character.id; seen.add(character.id); }
  }
  return result;
}

export function recommendTeams(characters: TeamCharacter[], team: TeamSlots): TeamRecommendation[] {
  const selected = team.map(id => characters.find(character => character.id === id)).filter(character => character !== undefined);
  const sources = selected.length ? selected : characters.filter(character => ['SS', 'S'].includes(character.tierRank)).slice(0, 8);
  const activeIds = new Set(selected.map(character => character.id)), seen = new Set<string>(), results: TeamRecommendation[] = [];
  for (const source of sources) for (const comp of selected.length ? source.teamComps ?? [] : (source.teamComps ?? []).slice(0, 2)) {
    // Sort a fresh identity list, never the owner's member order. JSON avoids delimiter collisions.
    const key = JSON.stringify(comp.members.map(member => resolveTeamMember(characters, member)?.id ?? member).sort());
    if (seen.has(key)) continue;
    seen.add(key);
    const overlap = new Set(comp.members.map(member => resolveTeamMember(characters, member)?.id).filter(id => id && activeIds.has(id))).size;
    results.push({ ...comp, key, sourceId: source.id, overlap });
  }
  return results.sort((a, b) => b.overlap - a.overlap);
}

export const teamElements: Record<string, Record<SupportedLocale, string>> = {
  pyro: { zh: '火', en: 'Pyro', ja: '炎' }, hydro: { zh: '水', en: 'Hydro', ja: '水' },
  electro: { zh: '雷', en: 'Electro', ja: '雷' }, cryo: { zh: '冰', en: 'Cryo', ja: '氷' },
  dendro: { zh: '草', en: 'Dendro', ja: '草' }, anemo: { zh: '风', en: 'Anemo', ja: '風' }, geo: { zh: '岩', en: 'Geo', ja: '岩' },
};

// Names retained from Main; numerical effect text is not a verified owner dataset yet.
export const teamResonances: Record<string, Record<SupportedLocale, string>> = {
  pyro2: { zh: '热诚之火', en: 'Fervent Flames', ja: '熱誠の炎' },
  hydro2: { zh: '愈疗之水', en: 'Soothing Water', ja: '癒しの水' },
  cryo2: { zh: '粉碎之冰', en: 'Shattering Ice', ja: '砕氷' },
  electro2: { zh: '激能之雷', en: 'High Voltage', ja: '高電圧' },
  anemo2: { zh: '迅捷之风', en: 'Impetuous Winds', ja: '疾風' },
  geo2: { zh: '坚定之岩', en: 'Enduring Rock', ja: '堅岩' },
  dendro2: { zh: '蔓生之草', en: 'Sprawling Greenery', ja: '蔓草' },
  quad: { zh: '交错之护', en: 'Protective Canopy', ja: '交錯の護り' },
};

export function plannedResonances(characters: TeamCharacter[], team: TeamSlots) {
  const elements = team.map(id => characters.find(character => character.id === id)?.element).filter(element => element !== undefined);
  if (new Set(elements).size === 4) return ['quad'];
  return [...new Set(elements)].filter(element => elements.filter(value => value === element).length >= 2 && teamResonances[`${element}2`]).map(element => `${element}2`);
}
