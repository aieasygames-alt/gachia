import Link from 'next/link';
import type { SupportedLocale } from '@gachia/core';
import { gameName } from '@/lib/data';

const pages = [
  ['characters', { zh: '角色', en: 'Characters', ja: 'キャラクター' }],
  ['weapons', { zh: '武器', en: 'Weapons', ja: '武器' }],
  ['guides', { zh: '攻略', en: 'Guides', ja: '攻略' }],
  ['kibo', { zh: 'Kibo 图鉴', en: 'Kibo', ja: 'キボ' }],
  ['world', { zh: '世界', en: 'World', ja: '世界' }],
  ['tier-list', { zh: '强度参考', en: 'Tier List', ja: 'Tier リスト' }],
  ['redeem-codes', { zh: '兑换码', en: 'Codes', ja: '交換コード' }],
] as const;

export function GameNav({ locale, current }: { locale: SupportedLocale; current?: string }) {
  const labels = {
    zh: { home: 'Gachia 首页', guide: '蓝色星原：旅谣' },
    en: { home: 'Gachia Home', guide: 'Azur Promilia' },
    ja: { home: 'Gachia ホーム', guide: 'アズールプロミリア' },
  }[locale];

  return (
    <header className="game-header">
      <div className="game-header__top">
        <div className="game-header__container">
          <Link className="game-header__brand" href={`/${locale}/azur-promilia`}>
            <span className="game-header__logo">G</span>
            <span>Gachia</span>
          </Link>
          <div className="game-header__context">
            <Link href={`https://gachia.com/${locale}`}>{labels.home}</Link>
            <span aria-hidden="true">/</span>
            <strong>{gameName(locale)}</strong>
          </div>
          <div className="game-header__locale">
            {(['zh', 'en', 'ja'] as const).map((targetLocale) => (
              <Link
                key={targetLocale}
                href={`/${targetLocale}/azur-promilia${current ? `/${current}` : ''}`}
                aria-current={targetLocale === locale ? 'page' : undefined}
              >
                {targetLocale.toUpperCase()}
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="game-header__nav-wrap">
        <nav className="game-header__nav" aria-label={`${gameName(locale)} navigation`}>
          <Link className={!current ? 'game-header__nav-link--current' : undefined} href={`/${locale}/azur-promilia`}>
            {labels.guide}
          </Link>
          {pages.map(([page, pageLabels]) => (
            <Link
              aria-current={current === page ? 'page' : undefined}
              className={current === page ? 'game-header__nav-link--current' : undefined}
              key={page}
              href={`/${locale}/azur-promilia/${page}`}
            >
              {pageLabels[locale]}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
