export type ThreeGameStatus = 'live' | 'test' | 'upcoming';

export type ThreeGameStatusCard = {
  id: 'aniimo' | 'azur-promilia' | 'lvmeng';
  status: ThreeGameStatus;
  title: string;
  summary: string;
  action: string;
  href: string;
  checkedAt: string;
};

export const THREE_GAME_STATUS_UPDATED_AT = '2026-09-30';

export const THREE_GAME_STATUS_CARDS: ThreeGameStatusCard[] = [
  {
    id: 'aniimo',
    status: 'live',
    title: '伊莫 S1「逐风启程」',
    summary: '已全平台上线。先处理官方客户端下载、S1 首日路线、虹光、家园、地图和奖励状态。',
    action: '进入 S1 入坑检查台',
    href: '/zh/aniimo/s1-check',
    checkedAt: THREE_GAME_STATUS_UPDATED_AT,
  },
  {
    id: 'azur-promilia',
    status: 'test',
    title: '蓝色星原：旅谣「旅迹测试」',
    summary: '测试信息应与正式版分开阅读；优先核对奇波、家园、养成、抽取和反馈记录的来源状态。',
    action: '进入旅迹测试核验台',
    href: '/zh/azur-promilia/travel-trace',
    checkedAt: THREE_GAME_STATUS_UPDATED_AT,
  },
  {
    id: 'lvmeng',
    status: 'upcoming',
    title: '绿梦：时空之声',
    summary: 'App Store 显示预计 2026 年 10 月 31 日推出；开服时间、互通、首发活动与奖励仍待官方公告核验。',
    action: '进入开服核验台',
    href: '/zh/lvmeng/launch-check',
    checkedAt: THREE_GAME_STATUS_UPDATED_AT,
  },
];
