/**
 * SEO metadata utilities for Gachia project
 * Includes Twitter Card, Open Graph, and other SEO enhancements
 */

import type { Metadata, ResolvingMetadata } from 'next';

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

/**
 * Generate metadata for game pages
 */
export function generateGameMetadata(gameId: string, gameName: string, gameDescription: string): Metadata {
  const ogImage = `/images/og/${gameId}.png`;

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
    images: [`/images/og/${gameId}.png`],
    imageAlt: `${gameName} Guide`,
    twitterCard: { card: 'summary_large_image' },
  });
}