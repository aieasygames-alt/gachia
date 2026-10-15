export type ThreeGameStatus = 'live' | 'test' | 'post-test' | 'upcoming';

export type ThreeGameStatusCard = {
  id: 'aniimo' | 'azur-promilia' | 'lvmeng';
  status: ThreeGameStatus;
  title: string;
  summary: string;
  action: string;
  href: string;
  checkedAt: string;
  sourceUrl: string;
};

export const THREE_GAME_STATUS_UPDATED_AT = '2026-10-15';

export const THREE_GAME_STATUS_CARDS: ThreeGameStatusCard[] = [
  {
    id: 'aniimo',
    status: 'live',
    title: '伊莫 S1「逐风启程」',
    summary: '已全平台上线。先处理官方客户端下载、S1 首日路线、虹光、家园、地图和奖励状态。',
    action: '进入 S1 入坑检查台',
    href: '/zh/aniimo/s1-check',
    checkedAt: '2026-09-30',
    sourceUrl: 'https://www.yimo.com/main',
  },
  {
    id: 'azur-promilia',
    status: 'post-test',
    title: '蓝色星原：旅谣「旅迹测试」',
    summary: '旅迹测试已于10月7日16:00结束；10月14日官方公布后续优化方向。测试资料归档，优化计划不等于正式版已实装。',
    action: '进入旅迹测试核验台',
    href: '/zh/azur-promilia/travel-trace',
    checkedAt: THREE_GAME_STATUS_UPDATED_AT,
    sourceUrl: 'https://www.taptap.cn/moment/859424390947801787',
  },
  {
    id: 'lvmeng',
    status: 'live',
    title: '绿梦：时空之声',
    summary: '1.0「时序的回响」10月15日公测已开启；三端同账号游戏数据互通、同一UID。先看官方下载、永久签到与最新维护状态。',
    action: '进入开服核验台',
    href: '/zh/lvmeng/launch-check',
    checkedAt: THREE_GAME_STATUS_UPDATED_AT,
    sourceUrl: 'https://www.taptap.cn/moment/859747177096807583',
  },
];
