import type { SupportedLocale } from '@gachia/core';
import { localeStr } from './types';
import rawAnomalies from './raw-anomalies.json';

export interface NteAnomaly {
  id: string;
  name: string;
  nameEn: string;
  type: string;
  typeZh: string;
  category: string;
  categoryZh: string;
  attribute: string;
  attributeEn: string;
  hp: string;
  weakness: string;
  weaknessEn: string;
  mechanics: string;
  mechanicsEn: string;
  location: string;
  locationEn: string;
  appearance: string;
  drops: string;
  dropsEn: string;
  strategy: string;
  strategyEn: string;
}

export const anomalies: NteAnomaly[] = rawAnomalies as unknown as NteAnomaly[];

export function getAnomalyName(a: NteAnomaly, locale: SupportedLocale): string {
  return localeStr(a.name, a.nameEn, locale);
}

export function getAnomalyByType(type: string): NteAnomaly[] {
  return anomalies.filter(a => a.type === type);
}
