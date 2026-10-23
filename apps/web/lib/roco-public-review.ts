import type { SupportedLocale } from '@gachia/core';
import publicReview from './roco-public-review.json';

export const ROCO_REVIEWED_ROUTES = ['', 'tier-list', 'download', 'map'] as const;
export type RocoReviewRoute = typeof ROCO_REVIEWED_ROUTES[number];
export const ROCO_PUBLIC_REVIEW_DATE = publicReview.reviewedAt;
export const ROCO_LIST_REVIEW = publicReview.lists;

export function isRocoPublicPageUnderReview(gameId: string, route = '') {
  return gameId === 'roco' && ROCO_REVIEWED_ROUTES.some(value => value === route);
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
