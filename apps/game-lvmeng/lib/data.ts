export const game = {
  launchDate: '2026-10-15（公测已开启）',
  platforms: ['Android', 'iOS', 'PC'],
  developer: '上海竹子绿梦网络科技有限公司',
  operator: '上海竹子互联网信息服务有限公司',
  license: '国新出审〔2024〕1307号',
  isbn: '978-7-498-13645-9',
  version: '1.0「时序的回响」',
  officialSite: 'https://lvmeng.zhuziplay.com/',
  taptap: 'https://www.taptap.cn/app/237561',
  appStore: 'https://apps.apple.com/cn/app/%E7%BB%BF%E6%A2%A6-%E6%97%B6%E7%A9%BA%E4%B9%8B%E5%A3%B0/id6791432398',
};

export const officialSources = [
  { label: '官方网站', url: game.officialSite },
  { label: 'TapTap 官方下载页', url: game.taptap },
  { label: 'App Store 下载页', url: game.appStore },
  { label: '国家新闻出版署审批信息', url: 'https://www.nppa.gov.cn/bsfw/jggs/yxspjg/gcwlyxspxx/202406/t20240625_853229.html' },
] as const;

export const playableCharacters = [
  { slug: 'he-yulian', name: '何雨莲（强袭·回声）', affiliation: '官方启程活动已公开', note: '官方启程活动确认：完成序章后参与奥城欢迎签到，累计登录第2天获得。技能、属性与养成材料待正式客户端核验。' },
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
  verifiedAt: '2026-10-15',
  clientVerified: false,
  official: '官方已公开',
  pending: '公测后核验',
} as const;

export const sourcePolicy = [
  { level: '官方已公开', description: '来自官网、官方 TapTap 公告、应用商店或监管审批信息，可直接用于基础资料。' },
  { level: '客户端核验', description: '公测后在当前客户端可复现并记录版本号、前置条件与核验日期的资料。' },
  { level: '社区待验证', description: '仅用于发现选题或机制方向，不作为数值、配装、掉落或活动结论。' },
] as const;

export const launchPriority = [
  { phase: '进入游戏前', tasks: ['使用官方三端下载入口，PC预留25GB、移动端15GB以上。', '同账号跨平台登录后核对UID，渠道与付费规则单独确认。', '查看最新维护/恢复公告，不只看原定开服时刻。'] },
  { phase: '开服当天', tasks: ['完成教学并记录功能解锁条件。', '核对首发版本号、活动期限和奖励领取条件。', '仅按当前客户端资料开始角色、地图与养成记录。'] },
  { phase: '首周', tasks: ['补齐角色图鉴、技能、材料与获取方式。', '整理区域、传送、收集和敌人资料。', '依据实测版本发布开荒、构筑与资源路线。'] },
] as const;

export const launchDayVerification = [
  {
    id: 'official-entry',
    status: '官方已公开',
    title: '官方入口与安装包',
    summary: '核对官网、TapTap 与 App Store 的当前入口，确认安装包版本、开发者信息与公告日期一致。',
    action: '仅从当前官方页面安装；预下载和实际开服时间以最新官方公告为准。',
    href: '/zh/lvmeng/download',
  },
  {
    id: 'account-and-server',
    status: '官方已公开',
    title: '账号、服务器与互通',
    summary: '官方确认同一账号在 PC、Android 与 iOS 间游戏数据互通，各平台为同一 UID；渠道和付费规则不据此外推。',
    action: '使用同一账号登录并核对 UID；服务器、渠道账号及付费余额以当前官方说明为准。',
    href: '/zh/lvmeng/faq',
  },
  {
    id: 'first-day-unlocks',
    status: '待客户端核验',
    title: '首日功能解锁',
    summary: '主线、地图、养成、活动与抽取功能的实际开放条件，需要以正式客户端教学为准。',
    action: '先完成教学并记录前置条件，再决定资源投入与探索回访顺序。',
    href: '/zh/lvmeng/starter-guide',
  },
  {
    id: 'rewards-and-banners',
    status: '待官方公告',
    title: '奖励、卡池与兑换',
    summary: '预约奖励、登录活动、测试返还和兑换码是独立机制；概率与保底也不能从旧测试外推。',
    action: '逐项核对来源、有效期、领取入口与适用角色；未确认信息不计入资源规划。',
    href: '/zh/lvmeng/redeem-codes',
  },
  {
    id: 'publishable-records',
    status: '待客户端核验',
    title: '可发布资料记录',
    summary: '角色、材料、地图与构筑只有在可复现且保留版本、前置条件和核验日期时才进入攻略库。',
    action: '按资料计划追踪版本变动；旧测试结论保留为历史参考，不覆盖当前资料。',
    href: '/zh/lvmeng/roadmap',
  },
] as const;

export const contentRoadmap = [
  { phase: '公测准备（历史阶段）', status: '已进入公测', scope: '核对应用商店预计日期与官方公告、预下载、开服时间、平台入口、账号规则、首发公告与奖励领取条件。', destinations: ['预约 / 下载', '公告活动', '常见问题'] },
  { phase: '开服当天', status: '待客户端核验', scope: '记录首发版本号、功能解锁、角色图鉴、活动期限、兑换入口与地图区域名称。', destinations: ['版本动态', '公开角色', '兑换码'] },
  { phase: '公测首周', status: '待客户端核验', scope: '补齐材料、装备、敌人、收集、主线推进和资源路线，并标明版本与前置条件。', destinations: ['养成资料', '地图探索', '开荒指南'] },
  { phase: '持续版本维护', status: '长期维护', scope: '按版本保留活动、角色、系统改动和旧资料适用范围，避免新版本覆盖历史结论。', destinations: ['版本动态', '公告活动', '入门与系统'] },
] as const;

export const releaseStatus = [
  { label: '全平台公测', value: '2026-10-15 已开启', state: 'PC Windows / Android / iOS；原定10:00开服曾延迟，官方随后公告恢复' },
  { label: '首发版本', value: game.version, state: '产品版本已由官方公开；安装包 build 号仍需在客户端核对' },
  { label: '跨平台游戏数据', value: '同账号互通、同一 UID', state: '不据此外推不同渠道账号或充值余额互通；登录后核对UID' },
  { label: '首发活动与卡池', value: '启程活动已公开', state: '永久签到与成长活动见福利页；卡池概率、保底与期限待逐项核验' },
] as const;

export const officialAnnouncements = [
  { title: '公测现已开启：下载、配置与互通', date: '2026-10-15', status: '官方已公开', summary: 'PC Windows、Android、iOS开放；同账号跨平台游戏数据互通、同一UID。PC预留25GB以上，移动端15GB以上；建议卸载旧测试客户端后重新下载。', url: 'https://www.taptap.cn/moment/859747177096807583' },
  { title: '服务器恢复与延迟补偿', date: '2026-10-15', status: '官方恢复公告', summary: '原定10:00开服曾因云服务网络波动延迟，官方随后确认已可以正常进入，并公告涌钻×1000邮件补偿。领取资格、期限与个人到账状态请在当前公告和邮箱复核。', url: 'https://www.taptap.cn/moment/859745458094866984' },
  { title: '1.0公测版本反馈建议收集信箱', date: '2026-10-15', status: '官方反馈入口', summary: '按PC或移动端记录客户端版本、设备、网络、复现步骤与截图；不要将账号密码或验证码写入公开反馈。', url: 'https://www.taptap.cn/moment/859750698839969512' },
  { title: '启程活动合集', date: '2026-10-14', status: '官方已公开', summary: '完成序章「梦境伊始」后开放永久签到、成长与特训活动；累计登录第2天获得何雨莲（强袭·回声），第7天获得洛夕服饰「晴空漫游」。', url: 'https://www.taptap.cn/moment/859169001488517438' },
  { title: '1.0商城与作战合约', date: '2026-10-14', status: '官方已公开', summary: '1.0「时序的回响」商城补给与作战合约说明。付费商品不计入免费福利；购买前核对当前价格、条件与内容。', url: 'https://www.taptap.cn/moment/859175138438941149' },
  { title: '公测定档与预约里程碑（历史公告）', date: '2026-09-24', status: '历史公告', summary: '预约里程碑列有A级御能者「塔可」、原装频带×20、信用点×100000、作战经验×50000。与签到、补偿分别记录；当前领取范围和到账入口以客户端及后续官方公告为准。', url: 'https://www.taptap.cn/moment/851913923757083391' },
] as const;

export const previewFollowUpChecklist = [
  {
    title: '开服与下载信息',
    status: '先看官方公告',
    summary: '三端公测已开启；先核对最新恢复或维护公告，再使用官方下载入口。安装包build与个人登录状态仍须客户端确认。',
    href: '/zh/lvmeng/download',
  },
  {
    title: '账号、区服与互通',
    status: '逐项确认',
    summary: '同账号跨平台游戏数据互通、同一UID已确认；登录后核对UID。渠道账号、充值余额、服务器与改区规则未据此认定。',
    href: '/zh/lvmeng/faq',
  },
  {
    title: '卡池、福利与兑换',
    status: '不要合并估算',
    summary: '把首发卡池、概率与保底、预约里程碑、登录活动、测试返还和兑换码分别记录来源、有效期、参与条件与领取入口。',
    href: '/zh/lvmeng/redeem-codes',
  },
  {
    title: '首日客户端复核',
    status: '以正式客户端为准',
    summary: '进入游戏后再核对功能解锁、角色图鉴、材料来源、活动期限和地图区域名称；前瞻演示与测试攻略不直接替代可复现资料。',
    href: '/zh/lvmeng/launch-check',
  },
] as const;

export const officialEntryPoints = [
  { label: '官方网站', url: game.officialSite, purpose: '下载入口、官网活动与后续新闻。' },
  { label: '官方角色页', url: 'https://lvmeng.zhuziplay.com/role', purpose: '已公开角色和设定线索。' },
  { label: 'TapTap 官方公告', url: 'https://www.taptap.cn/app/237561/topic?type=official', purpose: '公测、版本、维护、活动和兑换码的优先核验来源。' },
  { label: 'TapTap 官方下载页', url: game.taptap, purpose: '预约状态、平台资料与配置说明。' },
] as const;

export const launchFaq = [
  { question: '绿梦：时空之声什么时候公测？', answer: '2026年10月15日全平台公测已开启。原定10:00曾延迟，官方随后确认恢复；当前维护和个人登录状态仍以最新公告及客户端为准。' },
  { question: '首发支持哪些平台？', answer: '官方开服公告确认PC（Windows）、Android与iOS开放。同一账号跨平台游戏数据互通，各平台为同一UID。' },
  { question: '在哪里预约或下载最安全？', answer: '请使用官方网站、TapTap 官方下载页或 App Store 下载页。不要使用论坛附件、转存安装包或第三方兑换工具。' },
  { question: '绿梦的横版 ACT 玩法先该学什么？', answer: '先在正式客户端熟悉闪避、地面与空中衔接、角色切换和援护触发。测试期连招与帧数细节可以作为练习线索，但不能直接替代公测操作结论。' },
  { question: '公测前能直接照搬配队和武器攻略吗？', answer: '不建议。测试版本的角色数值、武器效果、资源获取和敌人环境都可能调整。公测前可用角色定位和队伍职责理解思路，具体培养请等待当前客户端与官方说明。' },
  { question: '探索和隐藏内容应如何安排？', answer: '首日先完成主线与功能解锁，再回访有明确前置能力或任务条件的区域。不要因追逐测试期坐标而跳过传送、地图、任务或奖励入口。' },
  { question: '预约奖励、卡池福利和兑换码能一起计算吗？', answer: '不能。预约奖励、登录活动、测试返还和可输入兑换码是不同机制，只有官方明确领取条件、有效期和入口后才可纳入首日资源规划。' },
  { question: '预约奖励和兑换码是一回事吗？', answer: '不是。预约奖励、测试返还和兑换码通常是不同机制；本站仅在官方公告明确兑换方式、有效期与奖励后收录兑换码。' },
  { question: '账号是否互通、服务器怎么选？', answer: '官方确认同一账号跨平台游戏数据互通、同一UID。不同渠道账号、充值余额、服务器划分和改区规则仍需单独确认，不能从游戏数据互通外推。' },
  { question: '测试期角色强度或配装能直接参考吗？', answer: '不能直接作为正式结论。测试版本的数值、装备、角色平衡、资源获取和系统名称都可能在公测调整。' },
] as const;

export const redeemCodeStatus = {
  verifiedAt: '2026-10-15',
  codes: [] as Array<{ code: string; reward: string; expiresAt: string; source: string }>,
  redemptionSteps: ['打开公测客户端内的官方兑换入口。', '确认兑换码适用的平台、角色与有效期。', '完成兑换后在游戏内邮箱或指定界面领取奖励。'],
} as const;

export const starterGuideSections = [
  { title: '先完成序章「梦境伊始」', description: '官方启程活动公告确认：完成序章后可参与签到、成长与特训活动。其他功能的精确解锁等级仍待客户端实测，不预设最快通关时间。' },
  { title: '领取永久签到与成长奖励', description: '先在奥城欢迎签到记录累计天数：第2天何雨莲（强袭·回声）、第7天洛夕服饰。推进主线可领取旅途的伊始奖励，各阶段一次。永久活动不必因首周错过而抢进度。' },
  { title: '无体力活动与挑战', description: '官方公告说明奥城防卫与30层深层演算试炼不消耗体力；解锁、难度与奖励在活动页确认，不据此承诺首日全通。' },
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
  { version: game.version, date: '2026-10-15', status: '公测已开启', summary: 'PC Windows、Android、iOS开放，同账号游戏数据互通、同一UID。原定10:00曾延迟，官方随后公告恢复及涌钻×1000补偿；当前状态以最新公告为准。产品版本不等于安装包build，角色数值与卡池规则仍待逐项核验。' },
  { version: '公测前瞻（历史事件）', date: '2026-10-09', status: '已结束', summary: '前瞻预告窗口已经过去，当前以1.0开服公告和正式客户端为准，不继续引导等待节目或领取未经核验的直播码。' },
] as const;

export const systemOverview = [
  { title: '横版动作与探索', description: '核心体验是横版战斗和关卡探索，场景包含荒野、都市废墟、人造奇观与危险禁区等不同环境。' },
  { title: '地面与空中切换', description: '战斗强调地面、空中的位移与衔接；实战应先熟悉闪避、起跳、落地和技能取消的节奏。' },
  { title: '队伍与援护', description: '第三方测试攻略普遍提及角色切换、援护和能量管理；正式服名称、触发条件与数值须以游戏内教程为准。' },
  { title: '可选主角与女性角色池', description: '官方答疑说明主角性别可选，角色卡池为女性角色；正式卡池规则、概率和保底仍需等待公测公告。' },
] as const;

export const preparationChecklist = [
  '使用官网、TapTap 官方页或 App Store 下载正式客户端；不从论坛附件或非官方分发页安装客户端。',
  '进入游戏前先确认账号登录方式、服务器、最新维护和恢复状态，再决定是否充值或购买礼包。',
  '完成教程后优先熟悉闪避、空中位移、角色切换与援护触发，不以测试期强度榜决定首日培养。',
  '资源先集中投入一支可稳定通关的队伍；角色、装备、命座与卡池规则以公测客户端说明为准。',
];

export const launchRewards = [
  { item: '永久签到：奥城欢迎签到', note: '完成序章「梦境伊始」后开放；累计登录第2天获得S级御能者何雨莲（强袭·回声），第7天获得洛夕服饰「晴空漫游」。不是首周到期福利。' },
  { item: '永久成长：旅途的伊始', note: '推进主线章节领取原装频带×10及材料，各阶段奖励仅领取一次；权限解锁计划按权限等级发放补给。' },
  { item: '永久活动：多端适配勘验', note: '使用移动端、PC端或手柄进入活动页可领取对应涌钻奖励；具体数量与领取状态以活动页为准。' },
  { item: '预约里程碑（历史公告）', note: '公告列有A级塔可、原装频带×20、信用点×100000、作战经验×50000；不与签到或补偿合并估算，当前领取条件单独核对。' },
  { item: '延迟补偿（邮件）', note: '官方恢复公告列出涌钻×1000。资格、领取期限及到账状态待当前公告/邮箱复核；不是兑换码或永久签到。' },
] as const;

export const deviceRequirements = [
  { platform: 'PC Windows', minimum: 'Windows 10 64bit；i5第九代 / R5 2600X；GTX1060 / RX580；RAM 8GB以上', recommended: 'i7第十代 / R7 3700X；RTX2060 / RX5700XT；RAM 16GB以上', storage: '25GB以上' },
  { platform: 'Android', minimum: 'Android 13；骁龙8 Gen1 / 天玑9000；RAM 8GB以上', recommended: 'Android 14；骁龙8 Gen3 / 天玑9300；RAM 12GB以上', storage: '15GB以上' },
  { platform: 'iOS', minimum: 'iPhone13 Pro；iOS15.0；RAM 6GB以上', recommended: '官方公告未单列推荐档位', storage: '15GB以上' },
] as const;

export const launchSource = 'https://www.taptap.cn/moment/859747177096807583';
export const rewardsSource = 'https://www.taptap.cn/moment/859169001488517438';

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
