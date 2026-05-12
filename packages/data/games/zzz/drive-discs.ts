import type { SupportedLocale } from '@gachia/core';
import type { ZzzDriveDisc } from './types';
import { localeStr } from './types';
import rawDriveDiscs from './raw-drive-discs.json';

export const zzzDriveDiscs: ZzzDriveDisc[] = rawDriveDiscs as unknown as ZzzDriveDisc[];

export function getZzzDriveDiscName(disc: ZzzDriveDisc, locale: SupportedLocale): string {
  return localeStr(disc.name, disc.nameEn, locale, disc.nameJa);
}

export function getZzzDriveDiscDesc2pc(disc: ZzzDriveDisc, locale: SupportedLocale): string {
  return localeStr(disc.setDescription2pc, disc.setDescription2pcEn, locale);
}

export function getZzzDriveDiscDesc4pc(disc: ZzzDriveDisc, locale: SupportedLocale): string {
  return localeStr(disc.setDescription4pc, disc.setDescription4pcEn, locale);
}

export function getZzzDriveDiscById(id: string): ZzzDriveDisc | undefined {
  return zzzDriveDiscs.find((d) => d.id === id);
}
