import type { SupportedLocale } from '@gachia/core';
import { materials, isNteJapanesePathIndexable as guideJapaneseIndexable, isNteLocaleIndexable as guideLocaleIndexable } from './data';

// Material detail URLs were indexable on Main in all three locales. Moving
// their owner must not apply the broader Japanese hub's noindex policy to them.
export function isNteJapanesePathIndexable(path = '') {
  const match = path.match(/^\/items\/([^/]+)$/);
  return match ? materials.some(row => row.id === match[1]) : guideJapaneseIndexable(path);
}
export function isNteLocaleIndexable(locale: SupportedLocale, path = '') {
  if (path.startsWith('/items/')) return isNteJapanesePathIndexable(path);
  return guideLocaleIndexable(locale, path);
}
