import type { SupportedLocale } from '@gachia/core';
import type { NteDiskSet, NteBuild, NteCharacterMaterials } from './types';
import { localeStr } from './types';
import rawDiskSets from './raw-disk-sets.json';
import rawBuilds from './raw-builds.json';
import rawCharacterMaterials from './raw-character-materials.json';
import rawImageSources from './raw-image-sources.json';

const imgSrc = rawImageSources as unknown as Record<string, unknown>;

export const diskSets: NteDiskSet[] = rawDiskSets as unknown as NteDiskSet[];
export const builds: NteBuild[] = rawBuilds as unknown as NteBuild[];
export const characterMaterials: NteCharacterMaterials[] = rawCharacterMaterials as unknown as NteCharacterMaterials[];

export function getNteDiskSetName(ds: NteDiskSet, locale: SupportedLocale): string {
  return localeStr(ds.name, ds.nameEn, locale);
}

export function getNteDiskSetDesc2pc(ds: NteDiskSet, locale: SupportedLocale): string {
  return localeStr(ds.setDescription2pc, ds.setDescription2pcEn, locale);
}

export function getNteDiskSetDesc4pc(ds: NteDiskSet, locale: SupportedLocale): string {
  return localeStr(ds.setDescription4pc, ds.setDescription4pcEn, locale);
}

export function getBuildsForCharacter(charId: string): NteBuild | undefined {
  return builds.find((b) => b.characterId === charId);
}

export function getMaterialsForCharacter(charId: string): NteCharacterMaterials | undefined {
  return characterMaterials.find((m) => m.characterId === charId);
}

export function getCharacterImageUrl(charId: string): string {
  return ((imgSrc.characters ?? {}) as Record<string, string>)[charId] || '';
}

export function getWeaponImageUrl(weaponId: string): string {
  return ((imgSrc.weapons ?? {}) as Record<string, string>)[weaponId] || '';
}
