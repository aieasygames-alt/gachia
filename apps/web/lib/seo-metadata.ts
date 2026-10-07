/**
 * SEO metadata utilities for Gachia project
 * Includes Twitter Card, Open Graph, and other SEO enhancements
 */

import type { Metadata, ResolvingMetadata } from 'next';
import type { SupportedLocale } from '@gachia/core';

const BASE_URL = 'https://gachia.com';

export interface TwitterCardConfig {
  card?: 'summary' | 'summary_large_image' | 'app' | 'player';
  site?: string;
  creator?: string;
}

export interface SocialMetadata {
  title: string;
  description: string;
  images?: string[];
  imageAlt?: string;
  twitterCard?: TwitterCardConfig;
}

/**
 * Generate comprehensive social metadata for a page
 */
export function generateSocialMetadata(config: SocialMetadata): Metadata {
  const {
    title,
    description,
    images = [],
    imageAlt = title,
    twitterCard = { card: 'summary_large_image' },
  } = config;

  const metadata: Metadata = {
    // Open Graph (Facebook, LinkedIn, etc.)
    openGraph: {
      title,
      description,
      images: images.map((url) => ({
        url,
        width: 1200,
        height: 630,
        alt: imageAlt,
      })),
      type: 'website',
    },
    // Twitter Card
    twitter: {
      card: twitterCard.card,
      title,
      description,
      images: images.length > 0 ? images[0] : undefined,
    },
  };

  return metadata;
}

const META_MIN_LENGTH = 150;
const META_SUFFIX: Record<SupportedLocale, string> = {
  zh: '，同时提供角色、武器、攻略和实用工具入口，方便继续深入浏览与查找。',
  en: ' It also links to characters, weapons, guides, and useful tools for deeper browsing.',
  ja: 'さらにキャラ、武器、攻略、実用ツールへの導線もまとめています。',
};
const META_TITLE_MAX_LENGTH = 70;

export function ensureMetaLength(value: string, locale: SupportedLocale, target = META_MIN_LENGTH) {
  const normalized = value.trim().replace(/\s+/g, ' ');
  if ([...normalized].length >= target) return normalized;
  return `${normalized}${META_SUFFIX[locale] ?? META_SUFFIX.zh}`;
}

export function limitMetaTitle(value: string, fallback?: string, target = META_TITLE_MAX_LENGTH) {
  const trimmed = value.trim();
  if ([...trimmed].length <= target) return trimmed;

  const fallbackTitle = fallback?.trim();
  if (fallbackTitle && [...fallbackTitle].length <= target) return fallbackTitle;

  return [...trimmed].slice(0, target).join('').trim();
}

export function toHreflang(locale: SupportedLocale) {
  return locale === 'zh' ? 'zh-Hans' : locale;
}

export function buildLocalizedAlternates(
  locale: SupportedLocale,
  pathForLocale: (locale: SupportedLocale) => string,
  locales: readonly SupportedLocale[],
  options: {
    includeLocale?: (locale: SupportedLocale) => boolean;
    defaultLocale?: SupportedLocale;
  } = {}
) {
  const defaultLocale = options.defaultLocale ?? 'zh';
  const languages: Record<string, string> = {};

  for (const lang of locales) {
    if (options.includeLocale && !options.includeLocale(lang)) continue;
    languages[toHreflang(lang)] = `${BASE_URL}${pathForLocale(lang)}`;
  }

  languages['x-default'] = `${BASE_URL}${pathForLocale(defaultLocale)}`;

  return {
    canonical: `${BASE_URL}${pathForLocale(locale)}`,
    languages,
  };
}

export function getEntryUpdatedAt(entry: unknown): string | undefined {
  if (!entry || typeof entry !== 'object') return undefined;
  const updatedAt = (entry as { updatedAt?: unknown }).updatedAt;
  return typeof updatedAt === 'string' ? updatedAt : undefined;
}

export function getEntryCurrentVersion(entry: unknown): string | undefined {
  if (!entry || typeof entry !== 'object') return undefined;
  const currentVersion = (entry as { currentVersion?: unknown }).currentVersion;
  return typeof currentVersion === 'string' ? currentVersion : undefined;
}

export function hasLocalizedContent(entry: unknown, locale: SupportedLocale, minimumLength = 80) {
  if (locale !== 'ja') return true;
  if (!entry || typeof entry !== 'object') return false;

  const content = (entry as { contentJa?: unknown }).contentJa;
  return typeof content === 'string' && content.trim().length >= minimumLength;
}

export function isAniimoCharacterIndexable(entry: unknown, locale: SupportedLocale) {
  if (!entry || typeof entry !== 'object') return false;

  const character = entry as {
    status?: unknown;
    description?: unknown;
    descriptionEn?: unknown;
    descriptionJa?: unknown;
    ability?: unknown;
    abilityZh?: unknown;
    abilityJa?: unknown;
    locationNote?: unknown;
    evolutionDetail?: unknown;
    sourceNote?: unknown;
  };
  const localizedDescription = locale === 'zh'
    ? character.description
    : locale === 'en'
      ? character.descriptionEn
      : character.descriptionJa;
  const localizedAbility = locale === 'zh'
    ? character.abilityZh
    : locale === 'en'
      ? character.ability
      : character.abilityJa;
  const requiredFields = [
    localizedDescription,
    localizedAbility,
    character.locationNote,
    character.evolutionDetail,
    character.sourceNote,
  ];
  const minimumLength = locale === 'en' ? 80 : 40;

  return character.status === 'Verified' && requiredFields.every(
    (field) => typeof field === 'string' && Array.from(field.trim()).length >= minimumLength,
  );
}

/**
 * Generate metadata for game pages
 */
export function generateGameMetadata(gameId: string, gameName: string, gameDescription: string): Metadata {
  const ogImage = `/images/og/${gameId}.webp`;

  return generateSocialMetadata({
    title: `${gameName} - 角色图鉴、武器、攻略大全 | Gachia`,
    description: gameDescription,
    images: [ogImage],
    imageAlt: `${gameName} Logo`,
    twitterCard: { card: 'summary_large_image' },
  });
}

/**
 * Generate metadata for character pages
 */
export function generateCharacterMetadata(
  gameId: string,
  gameName: string,
  characterName: string,
  characterDescription: string
): Metadata {
  const ogImage = `/images/${gameId}/characters/${characterName.toLowerCase()}.webp`;

  return generateSocialMetadata({
    title: `${characterName} - ${gameName}角色图鉴 | Gachia`,
    description: characterDescription,
    images: [ogImage],
    imageAlt: `${characterName} - ${gameName} Character`,
    twitterCard: { card: 'summary_large_image' },
  });
}

/**
 * Generate metadata for guide pages
 */
export function generateGuideMetadata(
  gameId: string,
  gameName: string,
  guideTitle: string,
  guideDescription: string
): Metadata {
  return generateSocialMetadata({
    title: `${guideTitle} - ${gameName}攻略 | Gachia`,
    description: guideDescription,
    images: [`/images/og/${gameId}.webp`],
    imageAlt: `${gameName} Guide`,
    twitterCard: { card: 'summary_large_image' },
  });
}
