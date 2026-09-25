export const game = {
  launchDate: '2026-10-15',
  platforms: ['Android', 'iOS', 'PC'],
  developer: '上海竹子绿梦网络科技有限公司',
  operator: '上海竹子互联网信息服务有限公司',
  license: '国新出审〔2024〕1307号',
  isbn: '978-7-498-13645-9',
  officialSite: 'https://lvmeng.zhuziplay.com/',
  taptap: 'https://www.taptap.cn/app/237561',
  appStore: 'https://apps.apple.com/cn/app/%E7%BB%BF%E6%A2%A6-%E6%97%B6%E7%A9%BA%E4%B9%8B%E5%A3%B0/id6791432398',
};

export const officialSources = [
  { label: '官方网站', url: game.officialSite },
  { label: 'TapTap 官方预约页', url: game.taptap },
  { label: 'App Store 预登记页', url: game.appStore },
  { label: '国家新闻出版署审批信息', url: 'https://www.nppa.gov.cn/bsfw/jggs/yxspjg/gcwlyxspxx/202406/t20240625_853229.html' },
] as const;

export const playableCharacters = [
  { slug: 'luoxi', name: '洛夕', affiliation: '侵蚀管理局', note: '官方角色页公开角色；以探索欲与高速冲锋的战斗形象登场。' },
  { slug: 'lita', name: '莉塔', affiliation: '官方角色页已公开', note: '官方角色页公开角色；正式版本的技能、属性和获取方式待客户端确认。' },
  { slug: 'shilin', name: '诗凛', affiliation: '官方角色页已公开', note: '官方角色页公开角色；测试期机制不作为正式服养成结论。' },
  { slug: 'pannaxiya', name: '潘娜西娅', affiliation: '官方角色页已公开', note: '官方角色页公开角色；上线后补充正式角色资料。' },
  { slug: 'take', name: '塔可', affiliation: '官方角色页已公开', note: '官方角色页公开角色；官方社区账号亦使用“塔可TaCo”名称。' },
  { slug: 'ameng', name: '阿萌', affiliation: '官方角色页已公开', note: '官方角色页公开角色；不预设首发强度或装备方案。' },
  { slug: 'beiyi', name: '贝伊', affiliation: '官方角色页已公开', note: '官方角色页公开角色；具体定位以公测内说明为准。' },
  { slug: 'aiti', name: '艾提', affiliation: '官方角色页已公开', note: '官方角色页公开角色；技能、养成和获取方式待公测客户端确认。' },
  { slug: 'mata', name: '玛塔', affiliation: '官方角色页已公开', note: '官方角色页公开角色；不根据测试期资料预设队伍定位。' },
] as const;

export const contentStatus = {
  verifiedAt: '2026-09-25',
  official: '官方已公开',
  pending: '公测后核验',
} as const;

export const releaseStatus = [
  { label: '公测定档', value: '2026-10-15', state: '官方公告已确认' },
  { label: '预下载与开服时间', value: '待官方公告', state: '尚未公开' },
  { label: '账号互通与服务器', value: '待官方公告', state: '尚未公开' },
  { label: '首发活动与卡池', value: '待官方公告', state: '尚未公开' },
] as const;

export const officialAnnouncements = [
  { title: '全平台公测定档与预约里程碑奖励', date: '2026-09', status: '已核验', summary: '官方 TapTap 公告确认 2026 年 10 月 15 日在 Android、iOS、PC 平台公测，并列出全部解锁的预约奖励。', url: 'https://www.taptap.cn/app/237561/topic?type=official' },
  { title: '官方公告汇总入口', date: '持续更新', status: '跟踪中', summary: '公测预下载、开服、版本维护、活动和兑换码以此官方公告页为优先核对来源。', url: 'https://www.taptap.cn/app/237561/topic?type=official' },
] as const;

export const redeemCodeStatus = {
  verifiedAt: '2026-09-25',
  codes: [] as Array<{ code: string; reward: string; expiresAt: string; source: string }>,
  redemptionSteps: ['打开公测客户端内的官方兑换入口。', '确认兑换码适用的平台、角色与有效期。', '完成兑换后在游戏内邮箱或指定界面领取奖励。'],
} as const;

export const starterGuideSections = [
  { title: '首日推进', description: '先完成主线与教学，确认功能开放条件；不要因测试期攻略预先跳过剧情、资源或地图节点。' },
  { title: '资源投入', description: '在确认正式角色、装备、活动与获取途径前，优先将资源保留给可稳定推进的基础队伍。' },
  { title: '战斗练习', description: '优先熟悉闪避、地面与空中衔接、切换与援护的正式触发条件，再规划高难挑战。' },
  { title: '探索回访', description: '以客户端地图和任务提示为准记录传送、收集和隐藏路线；测试期坐标与条件不直接沿用。' },
] as const;

export const mapDirectory = [
  { title: '区域目录', status: '公测后建立', description: '按客户端区域名称整理主线入口、传送点、收集与敌人图鉴。' },
  { title: '探索与收集', status: '公测后核验', description: '仅发布经客户端复核的收集路线、前置任务和版本适用范围。' },
  { title: '敌人与掉落', status: '公测后核验', description: '关联敌人图鉴、材料用途和推荐挑战条件，避免用测试期掉落替代正式资料。' },
] as const;

export const progressionDirectory = [
  { title: '角色养成', status: '待客户端图鉴', description: '等级、技能、突破材料、获取方式和版本适用范围。' },
  { title: '装备与构筑', status: '待正式系统说明', description: '装备类型、属性、套装或词条规则，以及可核验的角色适配。' },
  { title: '材料与货币', status: '待客户端图鉴', description: '来源、用途、周期限制和活动有效期，后续用于材料规划。' },
] as const;

export const versionHistory = [
  { version: '公测首发', date: '2026-10-15', status: '定档已确认', summary: '全平台公测日期已由官方公告确认；版本号、维护说明、首发活动与内容清单待正式公告。' },
] as const;

export const systemOverview = [
  { title: '横版动作与探索', description: '核心体验是横版战斗和关卡探索，场景包含荒野、都市废墟、人造奇观与危险禁区等不同环境。' },
  { title: '地面与空中切换', description: '战斗强调地面、空中的位移与衔接；实战应先熟悉闪避、起跳、落地和技能取消的节奏。' },
  { title: '队伍与援护', description: '第三方测试攻略普遍提及角色切换、援护和能量管理；正式服名称、触发条件与数值须以游戏内教程为准。' },
  { title: '可选主角与女性角色池', description: '官方答疑说明主角性别可选，角色卡池为女性角色；正式卡池规则、概率和保底仍需等待公测公告。' },
] as const;

export const preparationChecklist = [
  '使用官网、TapTap 官方页或 App Store 完成预约；不从论坛附件或非官方分发页安装客户端。',
  '开服当天先确认账号登录方式、服务器、预下载和开服时间，再决定是否充值或购买礼包。',
  '完成教程后优先熟悉闪避、空中位移、角色切换与援护触发，不以测试期强度榜决定首日培养。',
  '资源先集中投入一支可稳定通关的队伍；角色、装备、命座与卡池规则以公测客户端说明为准。',
];

export const launchRewards = [
  { item: 'A级御能者「塔可」', note: '官方 TapTap 公测定档公告列为预约里程碑全部解锁后的登录奖励。' },
  { item: '原装频带 ×20', note: '官方公告列为公测后登录奖励；实际到账条件以公测活动页为准。' },
  { item: '信用点 ×100000', note: '官方公告列为公测后登录奖励。' },
  { item: '作战经验 ×50000', note: '官方公告列为公测后登录奖励。' },
] as const;

export const worldGlossary = [
  { term: '大侵蚀', description: '公开资料用于指代故事背景中的重大异变事件。剧情成因、时间线和影响范围应以公测客户端主线与官方公告为准。' },
  { term: '侵蚀裂隙', description: '公开背景资料中出现的异常区域名称。实际探索规则、地图分布和解锁条件待正式版本核验。' },
  { term: '黑质', description: '公开资料中出现的世界观名词。本文不据此推断材料用途、养成消耗或战斗属性。' },
  { term: '蚀生体', description: '公开资料中用于描述受侵蚀影响生命体的名词。敌人分类、图鉴与掉落以游戏内资料为准。' },
  { term: '侵蚀管理局', description: '官方角色页公开的组织线索，角色洛夕与其相关。其他组织关系将在官方设定或客户端图鉴公开后补充。' },
] as const;

export const publicWorldSources = [
  { label: '官方网站', url: game.officialSite, purpose: '核对公测前官方首页及后续设定更新。' },
  { label: '官方网站角色页', url: 'https://lvmeng.zhuziplay.com/role', purpose: '核对角色和已公开组织线索。' },
  { label: '公开背景资料参考', url: 'https://baike.baidu.com/item/%E7%BB%BF%E6%A2%A6%EF%BC%9A%E6%97%B6%E7%A9%BA%E4%B9%8B%E5%A3%B0/65952663', purpose: '交叉核对已公开的世界观术语；不替代官方客户端资料。' },
] as const;

export const launchVerificationChecklist = [
  '主线推进与功能解锁顺序：确认地图、养成、活动和抽取功能的实际开放条件。',
  '战斗与队伍机制：核验地面/空中衔接、切换、援护及资源循环的正式名称和触发条件。',
  '探索与地图：核验隐藏路线、传送、收集和区域回访的实际规则，不照搬测试期攻略坐标。',
  '养成与资源：核验角色、装备、材料和抽取资源的来源、消耗与活动期限后再发布路线。',
] as const;

export const communitySources = [
  { label: '官方网站角色页', url: 'https://lvmeng.zhuziplay.com/role', purpose: '核对已公开角色名单与官方人物设定。' },
  { label: '官方答疑公告', url: 'https://bbs.4399.cn/thread-view-tid-47257203', purpose: '核对类型、世界观、主角与卡池方向。' },
  { label: 'TapTap 攻略专区', url: 'https://www.taptap.cn/group/334788/group-label/531659', purpose: '观察社区测试期讨论，不将其视为正式数值依据。' },
  { label: 'TapTap 官方公告', url: 'https://www.taptap.cn/app/237561/topic?type=official', purpose: '核对公测日期、平台与预约里程碑奖励。' },
] as const;
