import { createNavigation } from 'next-intl/navigation';
import { expect, it } from 'vitest';
import { routing } from '../lib/i18n/routing';
import { requiresMainDocumentNavigation } from '../lib/i18n/main-link-policy';

const { getPathname } = createNavigation(routing);
for (const locale of ['zh', 'en', 'ja'] as const) {
  it(`uses real next-intl path/query serialization for ${locale} cross-owner URLs`, () => {
    const path = getPathname({ href: { pathname: '/nte/characters', query: { q: 'a b', tag: ['one', 'two'] } }, locale });
    expect(path).toBe(`/${locale}/nte/characters?q=a+b&tag=one&tag=two`);
    expect(requiresMainDocumentNavigation(path)).toBe(true);
    const item = getPathname({ href: { pathname: '/nte/items/annulith', query: { source: 'search' } }, locale });
    expect(item).toBe(`/${locale}/nte/items/annulith?source=search`);
    expect(requiresMainDocumentNavigation(item)).toBe(true);
    expect(getPathname({ href: 'https://gachia.com/en/genshin', locale })).toBe('https://gachia.com/en/genshin');
  });
}
