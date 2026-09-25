import type { Character, SupportedLocale } from '@gachia/core';

export type AzurPromiliaSource = {
  name: string;
  url: string;
  checkedAt: string;
  sourceType: 'official' | 'cbt' | 'community' | 'third-party';
  version?: 'official' | 'cbt-beta';
  status: 'official' | 'reference' | 'unverified';
};

export type AzurPromiliaSkillSummary = {
  id: string;
  category: 'normal' | 'resonance' | 'decision' | 'companion' | 'blessing' | 'reference';
  name: Record<SupportedLocale, string>;
  description: Record<SupportedLocale, string>;
  cooldown?: string;
  energyCost?: string;
};

export type AzurPromiliaBetaProfile = {
  element: string;
  profession: string;
  rarity: 4 | 5;
  weaponType: string;
  region: string;
  cbtVersion: string;
  battleTypes: string[];
  tuningMarks: {
    gains: string[];
    consumes: string[];
    requires: string[];
  };
  source: AzurPromiliaSource;
  skills: AzurPromiliaSkillSummary[];
};

export type AzurPromiliaCharacter = Character & {
  officialSource?: AzurPromiliaSource;
  officialVisualUrl?: string;
  officialRegion?: string;
  beta: AzurPromiliaBetaProfile;
};
