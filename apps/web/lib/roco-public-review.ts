import type { SupportedLocale } from '@gachia/core';
import publicReview from './roco-public-review.json';
import { isRocoLegacyWeaponId } from '@gachia/data/games/roco/weapons';

export const ROCO_REVIEWED_ROUTES = ['', 'tier-list', 'download', 'map', 'type-chart', 'eggs', 'merchant', 'weapons'] as const;
export type RocoReviewRoute = typeof ROCO_REVIEWED_ROUTES[number];
export const ROCO_PUBLIC_REVIEW_DATE = publicReview.reviewedAt;
export const ROCO_LIST_REVIEW = publicReview.lists;
export const ROCO_REVIEW_NAVIGATION = publicReview.navigation;

export function isRocoPublicPageUnderReview(gameId: string, route = '') {
  return gameId === 'roco' && (ROCO_REVIEWED_ROUTES.some(value => value === route)
    || (route.startsWith('weapons/') && isRocoLegacyWeaponId(route.slice('weapons/'.length))));
}

export const ROCO_PUBLIC_REVIEW: Record<RocoReviewRoute, Record<SupportedLocale, {
  title: string; description: string; checks: string[];
}>> = publicReview.pages;

export function rocoPublicReviewMetadata(route: RocoReviewRoute, locale: SupportedLocale) {
  const copy = ROCO_PUBLIC_REVIEW[route][locale];
  const canonical = `https://gachia.com/${locale}/roco${route ? `/${route}` : ''}`;
  return {
    title: `Roco Kingdom — ${copy.title}`,
    description: copy.description,
    robots: { index: false, follow: true },
    alternates: { canonical },
    openGraph: { title: copy.title, description: copy.description, url: canonical },
  };
}

export function rocoWeaponReviewMetadata(id: string, locale: SupportedLocale) {
  if (!isRocoLegacyWeaponId(id)) return null;
  const metadata = rocoPublicReviewMetadata('weapons', locale);
  const canonical = `${metadata.alternates.canonical}/${id}`;
  return { ...metadata, alternates: { canonical }, openGraph: { ...metadata.openGraph, url: canonical } };
}
