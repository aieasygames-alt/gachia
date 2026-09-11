import Link from 'next/link';
import type { SupportedLocale } from '@gachia/core';

const mainSite = 'https://gachia.com';

const copy = {
  zh: { games: '游戏资料', calendar: '日历', about: '关于', switchLanguage: '切换语言', home: 'Gachia 首页', breadcrumbHome: '首页', breadcrumbNte: '异环', resources: '资源', contact: '联系我们', disclaimer: 'Gachia 是独立的游戏资料站点，与游戏发行方无隶属关系。' },
  en: { games: 'Games', calendar: 'Calendar', about: 'About', switchLanguage: 'Change language', home: 'Gachia home', breadcrumbHome: 'Home', breadcrumbNte: 'NTE', resources: 'Resources', contact: 'Contact', disclaimer: 'Gachia is an independent game information site and is not affiliated with game publishers.' },
  ja: { games: 'ゲーム', calendar: 'カレンダー', about: '概要', switchLanguage: '言語を切り替え', home: 'Gachia ホーム', breadcrumbHome: 'ホーム', breadcrumbNte: 'NTE', resources: 'リソース', contact: 'お問い合わせ', disclaimer: 'Gachia は独立したゲーム情報サイトであり、ゲームのパブリッシャーとは提携していません。' },
} as const;

const games = [
  ['genshin', { zh: '原神', en: 'Genshin', ja: '原神' }],
  ['starrail', { zh: '崩坏：星穹铁道', en: 'Honkai: Star Rail', ja: '崩壊：スターレイル' }],
  ['wuwa', { zh: '鸣潮', en: 'Wuthering Waves', ja: '鳴潮' }],
  ['zzz', { zh: '绝区零', en: 'Zenless Zone Zero', ja: 'ゼンレスゾーンゼロ' }],
] as const;

function mainHref(locale: SupportedLocale, path = '') { return `${mainSite}/${locale}${path}`; }

export function PreviewSiteShell({ children, locale }: { children: React.ReactNode; locale: SupportedLocale }) {
  const t = copy[locale];
  return <div className="preview-shell">
    <div className="breadcrumb-bar"><div className="breadcrumb-bar__inner"><a href={mainHref(locale)}>{t.breadcrumbHome}</a><span aria-hidden="true">/</span><Link href={`/${locale}/nte`}>{t.breadcrumbNte}</Link></div></div>
    {children}
    <footer className="global-footer"><div className="global-footer__inner"><p>{t.disclaimer}</p><nav aria-label={t.resources}><a href={mainHref(locale, '/about')}>{t.about}</a><a href={mainHref(locale, '/contact')}>{t.contact}</a><a href={mainHref(locale, '/privacy')}>{locale === 'zh' ? '隐私政策' : locale === 'ja' ? 'プライバシー' : 'Privacy'}</a><a href={mainHref(locale, '/terms')}>{locale === 'zh' ? '服务条款' : locale === 'ja' ? '利用規約' : 'Terms'}</a></nav></div></footer>
  </div>;
}
