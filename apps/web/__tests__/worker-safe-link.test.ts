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
    for (const path of [`/${game}`, `/zh/${game}/characters?sort=name#list`, `/en/${game}`, `/ja/${game}/guides`, `https://gachia.com/zh/${game}`]) {
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

  it('preserves object href hashes and uses the current locale by default', () => {
    const html = renderToStaticMarkup(createElement(WorkerSafeLink, { href: { pathname: '/nte/characters', hash: '#list' } }, 'NTE'));
    expect(html).toContain('href="/en/nte/characters#list"');
  });

  it('leaves same-main links on the original internationalized Next Link', () => {
    const html = renderToStaticMarkup(createElement(WorkerSafeLink, { href: '/hi3/weapons' }, 'HI3'));
    expect(html).toContain('data-next-link="/hi3/weapons"');
  });
});
