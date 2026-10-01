import { SharedGameHeader, createSharedGameHeaderModel, headerGameName } from '@gachia/ui';

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

export function GameNav({ current, isHome = false }: { current?: string; isHome?: boolean }) {
  const locale = 'zh';
  const header = createSharedGameHeaderModel({
    gameId: 'lvmeng',
    locale,
    localeLinks: [{ href: '/zh/lvmeng', label: '中文', current: true }],
    sectionLabel: '绿梦：时空之声导航',
    sectionLinks: [
      { href: '/zh/lvmeng', label: headerGameName('lvmeng', locale), current: isHome },
      ...pages.map(([id, label]) => ({ href: `/zh/lvmeng/${id}`, label, current: current === id })),
    ],
  });

  return <SharedGameHeader header={header} />;
}
