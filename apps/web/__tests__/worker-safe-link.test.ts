import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { requiresMainDocumentNavigation } from '../lib/i18n/main-link-policy';

vi.mock('next-intl', () => ({ useLocale: () => 'en' }));
vi.mock('next-intl/navigation', () => ({ createNavigation: () => ({
  Link: (props: { href: string; children: React.ReactNode }) => createElement('span', { 'data-next-link': props.href }, props.children),
  getPathname: ({ href, locale }: { href: string | { pathname: string; hash?: string }; locale: string }) => {
    const path = typeof href === 'string' ? href : href.pathname;
    return path.startsWith('/') && !path.startsWith('//') ? `/${locale}${path}` : path;
  },
}) }));
import { WorkerSafeLink } from '../lib/i18n/worker-safe-link';

describe('main runtime navigation boundary', () => {
  for (const game of ['genshin', 'nte', 'azur-promilia', 'lvmeng']) {
    const paths = [`/${game}`, `/zh/${game}/characters?sort=name#list`, `https://gachia.com/zh/${game}`];
    if (game !== 'lvmeng') paths.push(`/en/${game}`, `/ja/${game}/guides`);
    for (const path of paths) {
      it(`${path} cannot reuse the main RSC runtime`, () => expect(requiresMainDocumentNavigation(path)).toBe(true));
    }
  }
  for (const path of ['/', '/zh', '/games', '/en/games', '/zh/hi3/weapons', '/wuwa', '/zh/genshin-other',
    '/zh/tools/pull-planner', '#genshin', 'https://example.com/zh/genshin', '//example.com/genshin']) {
    it(`${path} does not force a cross-Worker reload`, () => expect(requiresMainDocumentNavigation(path)).toBe(false));
  }

  it('renders live game links as native localized anchors without Next-only props', () => {
    const html = renderToStaticMarkup(createElement(WorkerSafeLink, {
      href: '/genshin', locale: 'ja', prefetch: true, replace: true, scroll: false,
      className: 'tile', target: '_blank', rel: 'noopener', title: 'Game',
    }, 'Genshin'));
    expect(html).toContain('<a '); expect(html).toContain('href="/ja/genshin"');
    expect(html).toContain('target="_blank"'); expect(html).toContain('class="tile"');
    expect(html).toContain('hrefLang="ja"'); expect(html).not.toMatch(/prefetch|replace|scroll|data-next-link/);
  });

  it('uses the localized target owner, not whole-game ownership', () => {
    for (const locale of ['zh', 'en', 'ja'] as const) {
      expect(requiresMainDocumentNavigation('/nte/items/annulith', locale)).toBe(false);
      expect(requiresMainDocumentNavigation(`/${locale}/nte/items/annulith?x=1#details`)).toBe(false);
      expect(requiresMainDocumentNavigation('/nte/items', locale)).toBe(true);
      expect(requiresMainDocumentNavigation('/nte/characters/aurelia', locale)).toBe(true);
      expect(requiresMainDocumentNavigation('/lvmeng', locale)).toBe(locale === 'zh');
    }
    const html = renderToStaticMarkup(createElement(WorkerSafeLink, { href: '/nte/items/annulith' }, 'Item'));
    expect(html).toContain('data-next-link="/nte/items/annulith"');
    expect(requiresMainDocumentNavigation('/lvmeng', 'en')).toBe(false);
    const localized = renderToStaticMarkup(createElement(WorkerSafeLink, { href: '/lvmeng', locale: 'zh' }, 'Game'));
    expect(localized).toContain('href="/zh/lvmeng"');
  });

  it('preserves object href hashes and uses the current locale by default', () => {
    const html = renderToStaticMarkup(createElement(WorkerSafeLink, { href: { pathname: '/nte/characters', hash: '#list' } }, 'NTE'));
    expect(html).toContain('href="/en/nte/characters#list"');
  });

  it('leaves same-main links on the original internationalized Next Link', () => {
    const html = renderToStaticMarkup(createElement(WorkerSafeLink, { href: '/hi3/weapons' }, 'HI3'));
    expect(html).toContain('data-next-link="/hi3/weapons"');
  });
});
