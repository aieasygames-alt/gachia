import { describe, expect, it } from 'vitest';
import { platformMetadata } from '../lib/platform-metadata';
import { THREE_GAME_STATUS_CARDS, THREE_GAME_STATUS_LABELS } from '../lib/three-game-status';
import { getPathname } from '../lib/i18n/navigation';

describe('platform page metadata', () => {
  it.each(['', '/about', '/contact', '/privacy', '/terms'] as const)('provides stable localized canonical and sharing metadata for %s', path => {
    for (const locale of ['zh', 'en', 'ja'] as const) {
      const metadata = platformMetadata(locale, path, `Title ${locale}`, `Description ${locale}`);
      expect(metadata).toMatchObject({
        title: `Title ${locale}`, description: `Description ${locale}`,
        alternates: {
          canonical: `https://gachia.com/${locale}${path}`,
          languages: {
            'zh-Hans': `https://gachia.com/zh${path}`, en: `https://gachia.com/en${path}`,
            ja: `https://gachia.com/ja${path}`, 'x-default': `https://gachia.com/zh${path}`,
          },
        },
        openGraph: { title: `Title ${locale}`, description: `Description ${locale}`, url: `https://gachia.com/${locale}${path}` },
        twitter: { title: `Title ${locale}`, description: `Description ${locale}` },
      });
    }
  });

  it('localizes action routes once and keeps post-test distinct from upcoming', () => {
    expect(THREE_GAME_STATUS_LABELS['post-test']).toBe('测试已结束');
    expect(THREE_GAME_STATUS_LABELS.upcoming).toBe('待开服');
    for (const item of THREE_GAME_STATUS_CARDS) {
      expect(getPathname({ locale: 'zh', href: item.href })).toBe(`/zh${item.href}`);
      expect(item.href).not.toMatch(/^\/(zh|en|ja)\//);
    }
  });
});
