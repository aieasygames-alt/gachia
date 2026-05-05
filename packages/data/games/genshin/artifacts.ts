import type { SupportedLocale } from '@gachia/core';
import type { GenshinArtifactSet } from './types';
import { localeStr } from './types';
import rawArtifacts from './raw-artifacts.json';

export const artifactSets: GenshinArtifactSet[] = rawArtifacts as unknown as GenshinArtifactSet[];

export function getArtifactSetName(set: GenshinArtifactSet, locale: SupportedLocale): string {
  return localeStr(set.name, set.nameEn, locale);
}

export function getArtifactSetDesc2pc(set: GenshinArtifactSet, locale: SupportedLocale): string {
  return localeStr(set.bonus2pc, set.bonus2pcEn, locale);
}

export function getArtifactSetDesc4pc(set: GenshinArtifactSet, locale: SupportedLocale): string {
  return localeStr(set.bonus4pc, set.bonus4pcEn, locale);
}

export function getArtifactSetById(id: string): GenshinArtifactSet | undefined {
  return artifactSets.find((s) => s.id === id);
}
