import { THREE_GAME_STATUS_CARDS, type ThreeGameStatus } from '@/lib/three-game-status';

type RadarFocus = {
  title: string;
  description: string;
  checklist: string[];
};

const FOCUS_BY_STATUS: Record<ThreeGameStatus, RadarFocus> = {
  live: {
    title: '当前版本维护',
    description: '优先处理会直接影响当下游玩的入口、流程和奖励状态，并保留平台差异。',
    checklist: ['官方客户端、账号与区服入口', '首日流程、系统解锁与地图入口', '活动、兑换码和奖励的有效状态'],
  },
  'post-test': {
    title: '测试后复盘与变更追踪',
    description: '旅迹测试已结束。保留当期资料，并将官方后续优化计划与已经实装的机制分开。',
    checklist: ['测试结束时间与旧资料适用范围', '官方优化计划与待实装变更', '下一轮资格、客户端和正式版公告'],
  },
  test: {
    title: '测试观察记录',
    description: '测试内容只用于描述本轮可复现的体验，不外推为正式版规则或资源结论。',
    checklist: ['测试轮次、平台与参与前置条件', '可复现的系统流程与客户端记录', '官方反馈渠道与待确认变更'],
  },
  upcoming: {
    title: '开服准备核验',
    description: '先确认正式入口与可执行条件，再补充首日功能、奖励和版本资料。',
    checklist: ['官网、商店页与预下载入口', '账号、区服、互通和开服公告', '首发奖励、兑换码与首日解锁内容'],
  },
};

export const THREE_GAME_UPDATE_RADAR = THREE_GAME_STATUS_CARDS.map((item) => ({
  ...item,
  focus: FOCUS_BY_STATUS[item.status],
}));
