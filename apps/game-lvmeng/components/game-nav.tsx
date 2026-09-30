import Link from 'next/link';
import { createSharedHeaderModel, headerGameName } from '@gachia/ui';

const pages = [
  ['characters', '公开角色'],
  ['news', '公告活动'],
  ['world', '世界观与术语'],
  ['guides', '入门与系统'],
  ['starter-guide', '开荒指南'],
  ['map', '地图探索'],
  ['progression', '养成资料'],
  ['version', '版本动态'],
  ['launch-check', '开服核验'],
  ['download', '预约 / 下载'],
  ['redeem-codes', '兑换码'],
  ['faq', '常见问题'],
  ['roadmap', '资料计划'],
] as const;

export function GameNav({ current }: { current?: string }) {
  const locale = 'zh';
  const header = createSharedHeaderModel(locale);

  return <header className="gachia-header"><div className="gachia-header__top"><div className="gachia-header__container"><Link className="gachia-header__brand" href="https://gachia.com/zh"><span className="gachia-header__logo">G</span><span>Gachia</span></Link><nav className="gachia-header__games" aria-label="Game navigation">{header.featuredGames.map((game) => <Link key={game.id} href={`https://gachia.com/zh/${game.id}`} className="gachia-header__game-link">{game.label}</Link>)}<Link href="https://gachia.com/zh/games" className="gachia-header__all-link">{header.moreGamesLabel}</Link></nav><div className="gachia-header__actions"><span className="gachia-header__search-placeholder" aria-hidden="true">⌕ 搜索</span><span className="gachia-header__locale-current">中文</span></div></div></div><div className="gachia-header__section-wrap"><nav className="gachia-header__section" aria-label="绿梦：时空之声导航"><Link className={!current ? 'gachia-header__section-link--current' : undefined} href="/zh/lvmeng">{headerGameName('lvmeng', locale)}</Link>{pages.map(([id, label]) => <Link key={id} href={`/zh/lvmeng/${id}`} className={current === id ? 'gachia-header__section-link--current' : undefined}>{label}</Link>)}</nav></div></header>;
}
