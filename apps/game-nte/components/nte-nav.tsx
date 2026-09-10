import Link from 'next/link';
import type { SupportedLocale } from '@gachia/core';

export function NteNav({ locale, current }: { locale: SupportedLocale; current?: string }) {
  const labels = locale === 'zh' ? ['角色', '攻略', '版本', '武器', '兑换码'] : locale === 'ja' ? ['キャラクター', '攻略', 'バージョン', '武器', '交換コード'] : ['Characters', 'Guides', 'Version', 'Weapons', 'Codes'];
  const pages = ['characters', 'guides', 'version', 'weapons', 'redeem-codes'];
  return <header className="site-bar"><div className="site-bar__inner"><Link className="brand" href={`/${locale}/nte`}>Gachia · NTE</Link><nav className="nav" aria-label="NTE navigation">{pages.map((page, index) => <Link aria-current={current === page ? 'page' : undefined} className={current === page ? 'nav__link--current' : undefined} key={page} href={`/${locale}/nte/${page}`}>{labels[index]}</Link>)}</nav></div></header>;
}
