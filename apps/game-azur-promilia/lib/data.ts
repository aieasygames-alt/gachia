import { characters, tierLists, weapons } from '@gachia/data/games/azur-promilia';
import type { SupportedLocale } from '@gachia/core';

export { characters, tierLists, weapons };

export type Guide = {
  id: string;
  title: Record<SupportedLocale, string>;
  summary: Record<SupportedLocale, string>;
  content: Record<SupportedLocale, string>;
  source?: { name: string; url: string; checkedAt: string; sourceType: 'official' | 'cbt' | 'community' | 'third-party'; version: 'official' | 'cbt-beta'; status: 'official' | 'reference' | 'unverified' };
};

export const sourceStatusLabel = (status: 'official' | 'reference' | 'unverified' | undefined, locale: SupportedLocale) => ({
  official: { zh: '官方已确认', en: 'Officially verified', ja: '公式確認済み' },
  reference: { zh: '测试参考', en: 'Test reference', ja: 'テスト参照' },
  unverified: { zh: '待核验', en: 'Unverified', ja: '未確認' },
}[status ?? 'reference'][locale]);

export const travelTraceVerification = [
  {
    id: 'access-and-client',
    status: 'official' as const,
    label: { zh: '测试资格与客户端归档', en: 'Archived test access and client', ja: 'テスト参加とクライアントの記録' },
    summary: { zh: '旅迹测试已结束；保留资格、客户端来源和版本号，仅用于核对当时资料。', en: 'Travel Trace has ended; access, client-source, and version records remain only for checking period material.', ja: '旅跡テストは終了しました。参加資格、クライアント出典、版の記録は当時の資料確認にのみ使います。' },
    action: { zh: '仅通过官方页面追踪下一次开放或正式上线公告；不要使用旧客户端尝试登录。', en: 'Track a future opening or launch only through official pages; do not attempt to log in with an old client.', ja: '次回の開放または正式配信は公式ページだけで追跡し、旧クライアントでのログインは試みません。' },
    href: 'version',
  },
  {
    id: 'kibo-and-homestead',
    status: 'reference' as const,
    label: { zh: '奇波与家园循环', en: 'Kibo and homestead loop', ja: 'キボと拠点循環' },
    summary: { zh: '捕捉、派遣、设施与产出均为旅迹测试记录，旧录像不推导正式效率。', en: 'Capture, dispatch, facilities, and output are Travel Trace records; old footage does not establish release efficiency.', ja: '捕獲、派遣、施設、産出は旅跡テストの記録であり、古い映像から正式版効率を導きません。' },
    action: { zh: '保留前置条件、派遣技能、实际产出与核验日期，待下一次官方版本开放后重新复核。', en: 'Retain prerequisites, dispatch skills, actual output, and verification date for re-checking when an official build next opens.', ja: '前提条件、派遣スキル、実際の産出、確認日を残し、次の公式版公開時に再確認します。' },
    href: 'kibo',
  },
  {
    id: 'combat-and-progression',
    status: 'reference' as const,
    label: { zh: '战斗与养成', en: 'Combat and progression', ja: '戦闘と育成' },
    summary: { zh: '角色数值、材料、配装和强度仅作为测试参考，不建立正式服优先级。', en: 'Character values, materials, builds, and power are test references only and do not establish release priorities.', ja: 'キャラ数値、素材、ビルド、強さはテスト参照であり、正式版優先度を定めません。' },
    action: { zh: '待正式材料表公开并复核后，再计算养成缺口；测试数值仅保留为对照。', en: 'Calculate material gaps only after official release tables are published and verified; retain test values only for comparison.', ja: '正式版の素材表が公開・確認された後に不足を計算し、テスト数値は比較用にのみ残します。' },
    href: 'planner',
  },
  {
    id: 'banner-and-currency',
    status: 'unverified' as const,
    label: { zh: '抽取、货币与保底', en: 'Banners, currency, and pity', ja: 'バナー、通貨、天井' },
    summary: { zh: '讨论“不歪池”时，仍须分别核对池名、概率、保底、货币来源与跨池规则。', en: 'Even when discussing no off-banner loss, verify banner name, rates, pity, currency sources, and carryover separately.', ja: 'すり抜けなしを議論する場合でも、バナー名、確率、天井、通貨源、持越し規則を個別に確認します。' },
    action: { zh: '以未来正式客户端概率页和官方公告为准；未确认项目不纳入抽数规划。', en: 'Use a future release client rate page and official notices; exclude unverified items from pull planning.', ja: '今後の正式クライアント確率画面と公式告知を基準にし、未確認項目はガチャ計画に含めません。' },
    href: 'guides/banner-system-status',
  },
  {
    id: 'rewards-and-codes',
    status: 'unverified' as const,
    label: { zh: '奖励与兑换码', en: 'Rewards and codes', ja: '報酬と交換コード' },
    summary: { zh: '测试奖励、预约福利、活动邮件和兑换码是不同机制，不能合并估算。', en: 'Test rewards, pre-registration benefits, event mail, and codes are separate mechanisms and cannot be combined for estimates.', ja: 'テスト報酬、事前登録特典、イベントメール、交換コードは別の仕組みであり、まとめて見積もれません。' },
    action: { zh: '记录奖励来源、领取条件、有效期和适用角色；无官方公告即保持待核验。', en: 'Record reward source, claim condition, expiry, and applicable character; keep it unverified without an official notice.', ja: '報酬の出典、受取条件、期限、対象キャラを記録し、公式告知がなければ未確認のままにします。' },
    href: 'redeem-codes',
  },
  {
    id: 'feedback-and-change-log',
    status: 'official' as const,
    label: { zh: '反馈与改动记录', en: 'Feedback and change log', ja: 'フィードバックと変更記録' },
    summary: { zh: '把复现步骤、版本号与截图/录像上下文分开记录，便于跟踪后续公告是否修复或调整。', en: 'Separate reproduction steps, version number, and screenshot/video context so later fixes or changes can be tracked.', ja: '再現手順、バージョン番号、スクリーンショット・動画の文脈を分けて記録し、後続の修正や調整を追跡します。' },
    action: { zh: '保留可复现记录，待官方再次开放反馈渠道后按版本重新提交。', en: 'Retain reproducible records and submit them against the relevant version when an official feedback channel reopens.', ja: '再現記録を残し、公式フィードバック窓口が再開した際に対象版で再提出します。' },
    href: 'guides/test-feedback-tracker',
  },
] as const;

export const kiboFacilities = [
  { id: 'logging-camp', label: { zh: '伐木场', en: 'Logging camp', ja: '伐採場' } },
  { id: 'quarry', label: { zh: '采石场', en: 'Quarry', ja: '採石場' } },
  { id: 'gathering-hut', label: { zh: '采集屋', en: 'Gathering hut', ja: '採集小屋' } },
  { id: 'hunting-ground', label: { zh: '狩猎场', en: 'Hunting ground', ja: '狩猟場' } },
  { id: 'mining-camp', label: { zh: '采矿营地', en: 'Mining camp', ja: '採掘場' } },
  { id: 'element-altar', label: { zh: '元素祭坛', en: 'Element altar', ja: '元素祭壇' } },
  { id: 'feeding-ground', label: { zh: '饲养场', en: 'Feeding ground', ja: '飼育場' } },
  { id: 'fishery', label: { zh: '渔场', en: 'Fishery', ja: '漁場' } },
  { id: 'sawmill', label: { zh: '锯木厂', en: 'Sawmill', ja: '製材所' } },
  { id: 'armor-workshop', label: { zh: '制甲工坊', en: 'Armor workshop', ja: '防具工房' } },
];

export const facilityReference = [
  { id: 'logging-camp', label: { zh: '伐木场', en: 'Logging camp', ja: '伐採場' }, description: { zh: 'CBT 中的基础木材供给入口。建设和制作出现木材缺口时优先检查此处。', en: 'A CBT source of basic wood. Check it first when construction or crafting needs wood.', ja: 'CBTでの基礎木材供給。建設・製作で木材が不足したら先に確認。' } },
  { id: 'quarry', label: { zh: '采石场', en: 'Quarry', ja: '採石場' }, description: { zh: 'CBT 中的基础石材供给入口，与伐木场共同支撑早期建设循环。', en: 'A CBT source of basic stone, paired with logging for early construction loops.', ja: 'CBTでの基礎石材供給。伐採場と組み合わせて序盤の建設循環を支える。' } },
  { id: 'gathering-hut', label: { zh: '采集屋', en: 'Gathering hut', ja: '採集小屋' }, description: { zh: '用于补足食物类供给；测试期需注意 Kibo 饱食等派遣条件。', en: 'Used for food supply; watch Kibo satiety and dispatch rules during tests.', ja: '食料供給を補う施設。テスト中はキボの満腹度など派遣条件に注意。' } },
  { id: 'hunting-ground', label: { zh: '狩猎场', en: 'Hunting ground', ja: '狩猟場' }, description: { zh: '按当前配方需求补皮革与肉类，通常排在木材、石材和基础食物之后。', en: 'Adds leather and meat as recipes demand them, usually after wood, stone, and basic food.', ja: '必要なレシピに応じて革と肉を補う。通常は木材・石材・基礎食料の後。' } },
  { id: 'mining-camp', label: { zh: '采矿营地', en: 'Mining camp', ja: '採掘場' }, description: { zh: '在装备或设施配方需要矿石时投入，不以旧测试产量推导正式优先级。', en: 'Use when equipment or facility recipes need ore; do not infer release priority from old output.', ja: '装備・施設レシピが鉱石を必要とする時に使う。旧テストの産出量から正式優先度を推測しない。' } },
  { id: 'element-altar', label: { zh: '元素祭坛', en: 'Element altar', ja: '元素祭壇' }, description: { zh: '服务于元素材料链，适合在队伍、成长或配方确有元素需求后再配置。', en: 'Supports elemental materials; add it when teams, growth, or recipes actually need them.', ja: '元素素材の供給に関わる。編成・育成・レシピで実際に必要になってから配置。' } },
  { id: 'feeding-ground', label: { zh: '饲养场', en: 'Feeding ground', ja: '飼育場' }, description: { zh: '与 Kibo 养护和生产链相关；产出与开放条件为旅迹测试记录，须待正式版本重新确认。', en: 'Related to Kibo care and production; output and unlock conditions are Travel Trace records and need release verification.', ja: 'キボの世話と生産に関係。産出と解放条件は旅跡テストの記録であり、正式版で再確認が必要です。' } },
  { id: 'fishery', label: { zh: '渔场', en: 'Fishery', ja: '漁場' }, description: { zh: '为料理、制作或特定任务补充水产资源；投资顺序仅记录旅迹测试中的资源判断。', en: 'Adds aquatic resources for cooking, crafting, or specific tasks; its investment order records only the Travel Trace resource judgment.', ja: '料理、製作、特定任務向けの水産資源を補う。投資順は旅跡テストでの資源判断のみを記録します。' } },
];

export const kiboLifeSkills = [
  { id: 'watering', label: { zh: '浇水', en: 'Watering', ja: '水やり' } },
  { id: 'farm labor', label: { zh: '农场劳作', en: 'Farm labor', ja: '農場作業' } },
  { id: 'woodworking', label: { zh: '木工', en: 'Woodworking', ja: '木工' } },
  { id: 'weaponsmithing', label: { zh: '武器锻造', en: 'Weaponsmithing', ja: '武器鍛造' } },
  { id: 'ignition', label: { zh: '点火', en: 'Ignition', ja: '点火' } },
  { id: 'mining', label: { zh: '采矿', en: 'Mining', ja: '採掘' } },
  { id: 'hunting', label: { zh: '狩猎', en: 'Hunting', ja: '狩猟' } },
  { id: 'caretaking', label: { zh: '照料', en: 'Caretaking', ja: '世話' } },
  { id: 'field-work', label: { zh: '野外劳作', en: 'Field work', ja: 'フィールド作業' } },
  { id: 'elemental-work', label: { zh: '元素作业', en: 'Elemental work', ja: '元素作業' } },
  { id: 'armorsmithing', label: { zh: '制甲', en: 'Armorsmithing', ja: '鎧製作' } },
];

export function kiboLabel(id: string, locale: SupportedLocale) {
  return [...kiboFacilities, ...kiboLifeSkills].find((entry) => entry.id === id)?.label[locale] ?? id;
}

export const tuningMarkGlossary = [
  { id: 'gains', label: { zh: '获得方式', en: 'How marks are gained', ja: '獲得方法' }, description: { zh: '角色通过攻击、技能或特定条件积累调谐印记。', en: 'Characters gain marks through attacks, skills, or specific conditions.', ja: '攻撃、スキル、特定条件で調律マークを蓄積します。' } },
  { id: 'consumes', label: { zh: '消耗方式', en: 'How marks are spent', ja: '消費方法' }, description: { zh: '部分技能会消耗已积累的调谐印记。', en: 'Some skills consume accumulated marks.', ja: '一部スキルは蓄積した調律マークを消費します。' } },
  { id: 'requires', label: { zh: '触发条件', en: 'Trigger requirements', ja: '発動条件' }, description: { zh: '技能或祝福可能要求特定元素、层数或战斗状态。', en: 'Skills or blessings may require an element, stack count, or combat state.', ja: 'スキルや祝福には属性、スタック数、戦闘状態が必要な場合があります。' } },
];

export const kiboLifecycle = [
  { id: 'capture', label: { zh: '捕捉', en: 'Capture', ja: '捕獲' }, description: { zh: '使用 Stella Card 通过 Star Link 尝试捕捉；降低目标生命值或使用更高稀有度卡片可提高成功率。', en: 'Use a Stella Card through Star Link; lowering target HP or using a higher-rarity card can improve success.', ja: 'ステラカードでスターリンク捕獲。対象HPを下げるか高レアカードで成功率が上がる場合があります。' } },
  { id: 'evolution', label: { zh: '进化', en: 'Evolution', ja: '進化' }, description: { zh: '进化规则和消耗尚未有正式版本数据；当前仅记录 CBT 中外观与战斗表现可能变化。', en: 'Release evolution rules and costs are not verified; CBT references only indicate appearance and behavior may change.', ja: '正式版の進化条件と消費は未確認。CBTでは外見や挙動が変化する可能性のみ記録しています。' } },
];

export const guides: Guide[] = [
  {
    "id": "kibo-battle-and-ecology",
    "title": {
      "en": "Travel Trace Kibo Guide: Ecology, Capture, Duels, and Release Boundaries",
      "ja": "旅跡テストのキボガイド：生態、捕獲、対決、正式版の確認範囲",
      "zh": "旅迹测试奇波指南：生态、捕捉、对决与正式服核验边界"
    },
    "source": {
      "url": "https://promilia.cn/",
      "name": "Azur Promilia Travel Trace Test official page",
      "status": "official",
      "version": "cbt-beta",
      "checkedAt": "2026-09-30",
      "sourceType": "official"
    },
    "content": {
      "en": "In Travel Trace, Kibo connects exploration, combat, homestead play, and duels. Separate four questions in every record: where a Kibo appears, how it is captured, what it contributes to the current team or homestead, and how duel mode unlocks and settles. This avoids turning a single encounter video, a CBT tier list, or an old screenshot into a universal “best Kibo” conclusion.\n\nExploration notes should retain region, time, weather, prerequisites, and test version. Capture notes should retain tools, target state, and tutorial conditions. Homestead notes should retain dispatch skills, facility needs, actual output, and verification date. Duel notes should separate play feel, matchmaking conditions, and rewards; the client and official notice decide the reward facts.\n\nBefore release, a Kibo record that is easy to update is more valuable than a fixed build table: source status, acquisition conditions, use cases, connected systems, and open verification items.",
      "ja": "旅跡テストでは、キボは探索、戦闘、拠点、対決の複数システムをつなぎます。記録は、どこで遭遇するか、どう捕獲するか、現在の編成・拠点に何をもたらすか、対決モードの解放と精算はどうなるかの4点に分けます。単発の遭遇動画、CBT Tier表、旧スクリーンショットを「最強キボ」という一つの結論にしないためです。\n\n探索記録には地域、時間、天候、前提任務、テスト版を残します。捕獲記録には道具、対象状態、チュートリアル条件を残します。拠点記録には派遣技能、施設需要、実際の産出、確認日を残します。対決記録は体験、マッチング条件、報酬を分け、報酬は現行クライアントと公式告知を基準にします。\n\n正式版前は固定育成表よりも、出典状態、入手条件、用途、関連システム、未確認項目を持つ更新しやすいキボ記録の方が価値があります。",
      "zh": "旅迹测试中，奇波同时连接探索、战斗、家园和对决等多个系统。记录时先分清四类问题：在哪里遇到、用什么方式捕捉、能为当前家园或队伍提供什么、对决模式如何解锁与结算。这样可以避免把单次遭遇视频、测试服强度榜或旧版本截图混为一条“最强奇波”结论。\n\n探索记录应保留地区、时间、天气、前置任务和测试版本；捕捉记录应保留道具、目标状态和是否存在教程引导；家园记录应保留派遣技能、设施需求、实际产出和验证日期；对决记录则应区分玩法体验、匹配条件和奖励，奖励以当前客户端和官方公告为准。\n\n公测前最有价值的不是提前给出固定养成表，而是建立可快速更新的奇波档案：来源状态、获取条件、用途、相邻系统和待验证项。"
    },
    "summary": {
      "en": "Puts Kibo ecology, capture, homestead dispatch, and duel discussion into one test-recording framework without presenting test rewards or balance as release rules.",
      "ja": "キボの探索生態、捕獲、拠点派遣、対決を一つのテスト記録枠にまとめ、テスト環境の報酬や強さを正式版規則として扱いません。",
      "zh": "把奇波的探索生态、捕捉、家园派遣和对决讨论归到同一套测试记录框架，不把测试环境里的强度或奖励写成正式服规则。"
    }
  },
  {
    "id": "homestead-progression",
    "title": {
      "zh": "旅迹测试家园养成：设施、派遣、资源缺口与减负记录法",
      "en": "Travel Trace Homestead Progression: Facilities, Dispatch, Resource Gaps, and Low-Friction Logs",
      "ja": "旅跡テストの拠点育成：施設、派遣、資源不足、負担を抑える記録法"
    },
    "summary": {
      "zh": "以“当前资源缺口”而不是“全设施立刻开完”组织家园建设，并将设施产出、派遣条件和测试版本分开记录。",
      "en": "Organizes homestead construction around current resource gaps instead of unlocking every facility immediately, with separate records for output, dispatch conditions, and test version.",
      "ja": "全施設の即時解放ではなく現在の資源不足で拠点建設を考え、産出、派遣条件、テスト版を分けて記録します。"
    },
    "content": {
      "zh": "家园系统最容易造成“看起来事情很多”的感受，因此需要让每次建设都回答一个明确问题：它解决哪项当前任务、哪种稳定资源，或哪一项派遣瓶颈。木材、石材、基础食物通常先于低频配方；装备、料理、鞍具或特定任务出现真实缺口后，再投入狩猎、采矿、元素、饲养或渔业链。\n\n派遣时同时记录设施适配、生活技能、奇波是否在出战队伍、饱食等条件及实际产出。若产出暂时没有消耗去向，就不应只为“全图鉴”占满派遣位。每条记录均应写明它来自旅迹测试，避免公测后配方、产量或开放条件变化时沿用旧结论。\n\n面向玩家的页面应优先给出短循环：领取已完成产出、补一个真实缺口、检查派遣条件、回到主线或探索。这样既能承接“家园怎么养”的搜索，也不会把测试期的重复劳动包装成必做日课。",
      "en": "Homestead systems can feel overwhelming, so each construction decision should answer one clear question: which current quest, reliable resource, or dispatch bottleneck does it solve? Wood, stone, and basic food usually precede low-frequency recipes. Add hunting, mining, elemental, care, or fishing chains only when equipment, cooking, saddles, or a task creates a real shortage.\n\nWhen dispatching, record facility fit, life skill, whether a Kibo is in the active party, satiety conditions, and actual output. If output has no current use, do not fill dispatch slots only for completion. Every record should name Travel Trace as its source so old conclusions are not carried into release after recipes, yields, or gates change.\n\nPlayer-facing pages should lead with a short loop: claim finished output, fill one real shortage, check dispatch conditions, then return to story or exploration. This serves “how to build homestead” searches without turning CBT repetition into a mandatory daily checklist.",
      "ja": "拠点システムはやることが多く見えやすいため、各建設判断は現在の任務、安定資源、派遣ボトルネックのどれを解決するかを明確にします。木材、石材、基礎食料は通常、低頻度レシピより先です。装備、料理、鞍、任務で本当の不足が出てから、狩猟、採掘、元素、飼育、漁業を追加します。\n\n派遣では、施設適性、生活技能、キボが出撃編成か、満腹度、実際の産出を記録します。現在使い道がない産出なら、達成目的だけで派遣枠を埋めません。すべての記録に旅跡テスト由来であることを記載し、正式版でレシピ、産出量、解放条件が変わった後に古い結論を使わないようにします。\n\nプレイヤー向けには、完了した産出を受け取り、一つの実際の不足を補い、派遣条件を確認し、メイン進行か探索へ戻る短い循環を案内します。CBTの反復を必須日課にせず、「拠点をどう育てるか」という検索に応えます。"
    },
    "source": {
      "name": "Azur Promilia Travel Trace Test official page",
      "url": "https://promilia.cn/",
      "checkedAt": "2026-09-30",
      "version": "cbt-beta",
      "sourceType": "official",
      "status": "official"
    }
  },
  {
    "id": "banner-system-status",
    "title": {
      "zh": "旅迹测试抽卡与“不歪池”状态说明：已确认内容、测试规则与公测待核验项",
      "en": "Travel Trace Banner Status: Confirmed Details, Test Rules, and Release Checks",
      "ja": "旅跡テストのバナー状況：確認済み情報、テスト規則、正式版確認項目"
    },
    "summary": {
      "zh": "围绕“不歪池”讨论，明确限定获取、保底、概率、货币和角色规划必须按来源和版本拆分；测试口径不外推到公测。",
      "en": "Clarifies that limited acquisition, pity, rates, currency, and pull planning must be separated by source and version; CBT wording is not projected onto release.",
      "ja": "「すり抜けなし」議論を軸に、限定入手、天井、確率、通貨、ガチャ計画を出典と版で分け、CBT表現を正式版へ外挿しません。"
    },
    "content": {
      "zh": "“不歪池”是旅迹测试期间最容易传播的抽卡话题，但它不足以单独说明整个获取系统。页面应把四类信息分开：官方明确公布的测试规则、当前客户端能看到的展示规则、玩家对体感和资源压力的讨论，以及公测尚未确认的项目。\n\n在测试期，任何抽取建议都应先写清适用版本、池子名称、角色/武器范围、保底显示、概率说明和结束时间。不要把单次结果、社区汇总或上一轮测试的规则包装成正式服福利。对没有正式确认的部分，最有价值的内容是核验清单：公测时需要确认是否仍适用、是否跨池继承、货币来源和礼包边界是什么。\n\n对玩家而言，测试期可先按目标角色与试玩需求安排资源，不建议以未确认的长期产出或公测返利来计算最终抽数。",
      "en": "“No off-banner loss” is one of Travel Trace’s most shareable pull topics, but it does not describe the whole acquisition system. Separate four layers on the page: test rules explicitly published by the official team, rules visible in the current client, player discussion about feel and resource pressure, and items not confirmed for release.\n\nDuring a test, every pull recommendation should state its version, banner name, character/weapon scope, displayed pity, rate notice, and end time. Do not present a single result, community compilation, or a prior test rule as a release benefit. For unconfirmed points, the most useful content is a release checklist: whether it remains applicable, whether pity carries between banners, and how currency sources and package limits work.\n\nPlayers can plan around a target character and test needs, but should not calculate final pulls from unconfirmed long-term income or release rebates.",
      "ja": "「すり抜けなし」は旅跡テストで広まりやすいガチャ話題ですが、取得システム全体を説明するものではありません。公式が明示したテスト規則、現行クライアントで見える規則、体感や資源負担に関するプレイヤー議論、正式版未確認項目の4層を分けます。\n\nテスト中のガチャ推奨には、適用バージョン、バナー名、キャラ/武器範囲、表示天井、確率表示、終了時刻を必ず記します。単発結果、コミュニティ集計、前回テスト規則を正式版の福利として扱いません。未確認項目は、正式版でも適用されるか、天井がバナー間で引き継がれるか、通貨入手とパック境界は何かを確認するリストとして出すのが有用です。\n\nプレイヤーは目標キャラとテスト需要に沿って資源を計画できますが、未確認の長期収入や正式版還元から最終抽数を計算すべきではありません。"
    },
    "source": {
      "name": "Azur Promilia Travel Trace Test official page",
      "url": "https://promilia.cn/",
      "checkedAt": "2026-09-30",
      "version": "cbt-beta",
      "sourceType": "official",
      "status": "official"
    }
  },
  {
    "id": "test-feedback-tracker",
    "title": {
      "zh": "旅迹测试反馈追踪：家园、奇波、战斗、探索、养成与界面如何记录",
      "en": "Travel Trace Feedback Tracker: Homestead, Kibo, Combat, Exploration, Progression, and UI",
      "ja": "旅跡テストのフィードバック追跡：拠点、キボ、戦闘、探索、育成、UIの記録方法"
    },
    "summary": {
      "zh": "将社媒高频讨论转为可复核反馈：记录平台、版本、前置条件、复现路径和影响，而不是只保留情绪化结论。",
      "en": "Turns high-frequency social discussion into verifiable feedback by recording platform, version, prerequisites, reproduction, and impact rather than preserving only sentiment.",
      "ja": "SNSの頻出議論を、感情的な結論だけでなく、機種、版、前提、再現手順、影響を記録する検証可能なフィードバックに変えます。"
    },
    "content": {
      "zh": "旅迹测试的反馈应按系统分类：家园与派遣、奇波生态和对决、战斗手感、探索路径、养成节奏、界面与性能。每条记录至少包含平台、客户端版本、发生时间、前置任务/队伍状态、可复现步骤、实际结果、预期结果和截图或官方公告链接。\n\n“太肝”“没新意”“很好玩”可以保留为情绪信号，但不能直接成为站内事实。编辑时将其改写为可行动的问题，例如：某个资源循环的完成时长、某项功能的引导缺口、某个界面在移动端的可读性，或某个叙事视角的理解门槛。若官方随后回应或修复，应在原问题旁标注版本、状态和来源，而不是删除历史反馈。\n\n该追踪页的目标不是制造争议，而是让玩家、编辑和开发观察到哪些问题可以在下一次测试或公测版本中被验证。",
      "en": "Classify Travel Trace feedback by system: homestead and dispatch, Kibo ecology and duels, combat feel, exploration paths, progression pacing, and UI/performance. Each record should include platform, client version, time, prerequisite quest or party state, reproduction steps, actual result, expected result, and a screenshot or official-notice link.\n\n“Too grindy,” “not novel,” and “very fun” may remain as sentiment signals, but they cannot become site facts. Rewrite them into actionable questions: time to complete a resource loop, a missing onboarding step, mobile UI readability, or the comprehension burden of a narrative viewpoint. When the official team responds or fixes something, annotate the original issue with version, status, and source instead of deleting feedback history.\n\nThe tracker exists to let players, editors, and developers see which problems can be verified in a later test or release, not to manufacture controversy.",
      "ja": "旅跡テストのフィードバックは、拠点と派遣、キボ生態と対決、戦闘感、探索経路、育成テンポ、UIと性能で分類します。各記録には、機種、クライアント版、時刻、前提任務/編成状態、再現手順、実際結果、期待結果、スクリーンショットまたは公式告知リンクを含めます。\n\n「周回が重い」「新しさがない」「とても楽しい」は感情シグナルとして残せますが、サイト上の事実にはできません。資源循環の完了時間、案内不足、モバイルUIの可読性、物語視点の理解負荷など、実行可能な問いに書き換えます。公式が対応・修正した時は、元の問題を消さずに、版、状態、出典を追記します。\n\nこの追跡ページの目的は論争を作ることではなく、次のテストや正式版で検証できる問題をプレイヤー、編集者、開発者が見つけられるようにすることです。"
    },
    "source": {
      "name": "Azur Promilia Travel Trace Test official page",
      "url": "https://promilia.cn/",
      "checkedAt": "2026-09-30",
      "version": "cbt-beta",
      "sourceType": "official",
      "status": "official"
    }
  },
  {
    "id": "official-character-region-guide",
    "title": {
      "zh": "官方角色与地区关联整理",
      "en": "Official Character and Region Connections",
      "ja": "公式キャラクターと地域の関係"
    },
    "summary": {
      "zh": "将官方角色页公布的归属地与世界页地区资料连接起来，并明确未公布角色的边界。",
      "en": "Connects officially published character affiliations with the world index while preserving boundaries for unannounced characters.",
      "ja": "公式キャラクターページの関連地域と世界図鑑を結び、未発表キャラの境界を明確にします。"
    },
    "content": {
      "zh": "官方角色页目前可确认的关联包括：阿妮斯与卡斯贝尔关联弗里斯，辛福莉娅与梅茨娅关联洛斯兰瑟，特拉拉关联查露露村。角色图鉴中的“官方关联地”筛选器只使用这些官方可核验信息；没有该字段的角色不表示没有背景设定，而是本站尚未找到可直接引用的官方角色页。世界页则提供这些地区的地标与官方简介，适合从角色档案继续查阅其所在的城市、聚落或区域氛围。角色元素、职业、战斗标签与地区归属属于不同来源层级，不能用地区反推出战斗定位，也不能用 CBT 战斗数据补充官方剧情。",
      "en": "Official character pages currently confirm these affiliations: Anais and Cathbelle with Fris, Symphoria and Metsa with Los Lancer, and Terara with Charlulu Village. The character-index “Official region” filter uses only these verifiable links. Missing fields do not mean a character lacks a background; they mean this site has not found a directly citable official profile. The world page then provides landmarks and official introductions for the relevant cities, settlements, and regional atmosphere. Character element, profession, battle tags, and regional affiliation come from different source layers. Do not infer combat roles from a region or use CBT combat data to fill official story details.",
      "ja": "公式キャラクターページで確認できる関連は、アニスとキャスベルがフリス、シンフォーリアとメーツァがロスランサ、テララがシャルル村です。キャラクター図鑑の「公式関連地域」フィルターは、これらの検証可能な関係だけを使います。項目がないキャラクターに背景がないわけではなく、当サイトが直接引用できる公式プロフィールをまだ見つけていないことを示します。世界ページでは対応する都市、集落、地域の雰囲気について、地標と公式紹介を確認できます。属性、職業、戦闘タグ、地域の関係は出典層が異なるため、地域から戦闘役割を推測したり、CBT戦闘データで公式ストーリーを補完したりしません。"
    },
    "source": {
      "name": "Azur Promilia official character and world pages",
      "url": "https://azurpromilia.jp/character",
      "checkedAt": "2026-09-25",
      "version": "official",
      "sourceType": "official",
      "status": "official"
    }
  },
  {
    "id": "cbt-homestead-facility-decision-guide",
    "title": {
      "zh": "CBT 家园设施决策表：先建什么、先派谁",
      "en": "CBT Homestead Facility Decisions: What to Build and Dispatch First",
      "ja": "CBT拠点施設の判断表：建設と派遣の優先順位"
    },
    "summary": {
      "zh": "把竞品站分散的家园信息整理为按资源缺口做决策的表，而非固定抄作业。",
      "en": "Turns fragmented homestead information into a resource-gap decision table rather than a fixed copy-paste route.",
      "ja": "競合サイトに分散する拠点情報を、固定手順ではなく資源不足で判断する表に整理。"
    },
    "content": {
      "zh": "家园系统的关键不是把所有设施同时开完，而是让设施、奇波派遣和当前配方形成闭环。开始时先解决木材和石材，再补足维持派遣所需的食物；当装备、鞍具、料理或特定任务出现明确缺口时，再选择狩猎、采矿、元素、饲养或渔业设施。派遣奇波时同时看设施适配、生活技能、是否被队伍占用，以及饱食或其他测试限制。若某项设施产出暂时没有消耗去向，就不应为“全图鉴”而抢占派遣位。把每次建设记录为“当前需求、投入的奇波、预期产出、验证日期”，正式版规则变化时即可快速重排。",
      "en": "The key to homestead play is not unlocking every facility at once, but closing the loop between facilities, Kibo dispatch, and current recipes. Start with wood and stone, then food that keeps dispatch running. Add hunting, mining, elemental, care, or fishing facilities only when equipment, saddles, cooking, or a task creates a specific shortage. When dispatching a Kibo, consider facility fit, life skill, whether the Kibo is in the active team, and satiety or other test restrictions. If an output has no current use, do not consume a dispatch slot merely for completion. Log each build by current need, assigned Kibo, expected output, and verification date so rules can be reprioritized at release.",
      "ja": "拠点プレイの要点は全施設を同時に解放することではなく、施設、キボ派遣、現在のレシピを循環させることです。まず木材と石材、次に派遣維持の食料を解決します。装備、鞍、料理、任務で具体的な不足が出てから、狩猟、採掘、元素、飼育、漁業を追加します。キボ派遣では施設適性、生活技能、編成で使用中か、満腹度などのテスト制限を見ます。産出物に使い道がないなら、収集目的だけで派遣枠を使いません。建設ごとに現在の需要、派遣キボ、期待産出、確認日を記録すれば、正式版でルールが変わってもすぐ優先度を入れ替えられます。"
    },
    "source": {
      "name": "GameWith Beginner Guide",
      "url": "https://gamewith.ai/azurpromilia/en/beginner-guide",
      "checkedAt": "2026-09-25",
      "version": "cbt-beta",
      "sourceType": "cbt",
      "status": "reference"
    }
  },
  {
    "id": "cbt-character-index-reading-guide",
    "title": {
      "zh": "CBT 角色图鉴怎么读：元素、职业、战斗标签与调谐",
      "en": "How to Read the CBT Character Index: Elements, Roles, Tags, and Tuning",
      "ja": "CBTキャラクター図鑑の読み方：属性、職業、タグ、調律"
    },
    "summary": {
      "zh": "解释角色筛选器字段的用途，帮助玩家找资料而不是把测试标签误读成强度榜。",
      "en": "Explains the character-filter fields so players research rather than mistake test labels for a tier list.",
      "ja": "キャラクターフィルターの項目を説明し、テストタグをTier表と誤解せず資料を探せるようにします。"
    },
    "content": {
      "zh": "角色页的元素、职业、稀有度、武器、战斗类型和调谐印记均来自明确标注的 CBT 参考。正确阅读顺序是：先用元素和职业缩小范围，再看战斗类型判断角色是在制造破防窗口、保持场上输出、提供生存，还是围绕调谐印记运转；随后查看该角色获得、消耗和要求哪些印记，最后才看技能摘要。稀有度和单条被动不能单独推出培养价值，尤其在版本、武器、敌人和资源未稳定的测试期。需要做配队试验时，选择一个“产印记角色”、一个“消耗或利用印记角色”和一个补足生存/破防缺口的角色作为记录起点，而不是发布固定最强队。",
      "en": "Element, profession, rarity, weapon, battle type, and Tuning Marks on character pages are explicitly labelled CBT references. Read them in this order: use element and profession to narrow candidates; use battle types to see whether a character creates break windows, stays on field for damage, supplies survival, or revolves around Tuning Marks; then inspect which marks the character gains, consumes, or requires before reading skill summaries. Rarity and one passive alone do not prove investment value, especially in a test where versions, weapons, enemies, and resources are not stable. For a team experiment, start a log with one mark generator, one consumer or beneficiary, and one character that fills survival or break needs rather than publishing a fixed best team.",
      "ja": "キャラクターページの属性、職業、レアリティ、武器、戦闘タイプ、調律マークは、明確にCBT参照と表示されています。まず属性と職業で候補を絞り、戦闘タイプでブレイク機会を作るのか、場に残って火力を出すのか、生存を補うのか、調律マーク中心なのかを見ます。次に獲得・消費・要求するマークを確認してからスキル概要を読みます。レアリティや一つのパッシブだけで育成価値は決められません。バージョン、武器、敵、資源が安定していないテスト期では特に重要です。編成実験は、マーク生成役、消費または恩恵を受ける役、生存またはブレイク不足を補う役の3枠から記録を始め、固定最強編成として発信しません。"
    },
    "source": {
      "name": "GameWith character index",
      "url": "https://gamewith.ai/azurpromilia/en/characters",
      "checkedAt": "2026-09-25",
      "version": "cbt-beta",
      "sourceType": "cbt",
      "status": "reference"
    }
  },
  {
    "id": "test-registration-download-verification-guide",
    "title": {
      "zh": "测试报名与下载核验指南",
      "en": "Test Registration and Download Verification Guide",
      "ja": "テスト募集・ダウンロード確認ガイド"
    },
    "summary": {
      "zh": "避免把旧招募帖、第三方安装包或跨区信息误当作当前测试资格。",
      "en": "Avoid mistaking old recruitment posts, third-party installers, or cross-region claims for current test access.",
      "ja": "古い募集投稿、第三者インストーラー、地域外情報を現在の参加資格と誤認しないためのガイド。"
    },
    "content": {
      "zh": "每次测试只按四个入口核验：官网测试/预约页、官方社交账号、已认证应用商店页面和报名成功后的官方邮件或游戏内通知。先核对测试名称、报名截止时间、地区、平台、账号条件、是否删档和是否计费；再下载与公告域名或官方商店一致的客户端。第三方攻略、视频描述、群聊截图和旧测试安装包只能作为线索，不能证明当前资格、下载安全性或服务器开放状态。若公告没有明确 PC、iOS、Android、主机或地区，就在站内保持“待确认”，不要根据过去测试补写。",
      "en": "Verify every test through four entry points only: the official test or pre-registration page, official social accounts, authenticated app-store listings, and the official email or in-game notice after successful registration. Check the test name, deadline, region, platform, account conditions, whether data is wiped, and whether it is paid before downloading a client whose domain or store matches the notice. Third-party guides, video descriptions, chat screenshots, and old installers are leads only; they do not prove current access, download safety, or server status. When a notice does not explicitly name PC, iOS, Android, console, or a region, retain “pending confirmation” instead of filling it from an old test.",
      "ja": "各テストは、公式テスト・事前登録ページ、公式SNS、認証済みストア掲載、登録後の公式メールまたはゲーム内通知の4つだけで確認します。テスト名、締切、地域、対応機種、アカウント条件、データ削除、課金有無を確認してから、告知と同じドメインまたは公式ストアのクライアントを入手します。第三者攻略、動画説明、チャットのスクリーンショット、旧インストーラーは手掛かりに過ぎず、現在の参加資格、ダウンロードの安全性、サーバー状態を証明しません。告知にPC、iOS、Android、家庭用機、地域が明記されない場合は、過去テストから補完せず「確認待ち」にします。"
    },
    "source": {
      "name": "Azur Promilia official website",
      "url": "https://azurpromilia.jimi-global.com/en/",
      "checkedAt": "2026-09-25",
      "version": "official",
      "sourceType": "official",
      "status": "official"
    }
  },
  {
    "id": "patch-notes-and-feedback-watch-guide",
    "title": {
      "zh": "更新公告与反馈追踪：如何判断“已改”还是“计划改”",
      "en": "Patch Notes and Feedback Watch: Separating Implemented and Planned Changes",
      "ja": "更新告知とフィードバック追跡：実装済みと予定の区別"
    },
    "summary": {
      "zh": "为控制器、移动端操作、奇波对决和角色互动等热门问题建立可验证的追踪方法。",
      "en": "A verifiable tracking method for controller support, mobile controls, Kibo fights, and character interaction.",
      "ja": "コントローラー、モバイル操作、キボ対決、キャラクター交流などの話題を検証可能な形で追跡します。"
    },
    "content": {
      "zh": "面对“下个版本会不会修复”的讨论，先把信息分成三类：官方已上线的补丁说明、官方公布但尚未开放的计划、社区转述或玩家体验。只有第一类可写成当前功能；第二类应标为观察项；第三类只能作为问题线索。追踪每项改动时记录公告日期、原文链接、适用平台、版本号、测试或正式状态，以及能否在游戏内复现。控制器支持、移动端操作、奇波对决、宝箱限制、角色互动和职业平衡都适合按这个结构维护。这样内容既能回应热门讨论，也不会在正式版本前制造错误承诺。",
      "en": "When discussion asks whether the next version will fix something, classify information into three groups: official patch notes for features already live, official plans not yet opened, and community retellings or player experience. Only the first can be published as current functionality; the second needs a watch label; the third is only a lead. For every tracked change, record notice date, original link, applicable platform, version, test or release status, and whether it can be reproduced in-game. Controller support, mobile controls, Kibo fights, chest limits, character interaction, and class balance all fit this structure. It answers popular questions without creating false promises before release.",
      "ja": "「次のバージョンで直るか」という話題では、情報を3種類に分けます。実装済みの公式パッチノート、未公開の公式計画、コミュニティの伝聞またはプレイヤー体験です。現在の機能として書けるのは一つ目だけで、二つ目は観測ラベル、三つ目は問題の手掛かりに留めます。各変更は告知日、原文リンク、対象機種、バージョン、テストか正式版か、ゲーム内で再現できるかを記録します。コントローラー、モバイル操作、キボ対決、宝箱制限、キャラクター交流、職業バランスはすべてこの形で管理できます。正式配信前に誤った約束をせず、話題の疑問に答えられます。"
    },
    "source": {
      "name": "Community translation of JP update post",
      "url": "https://www.reddit.com/r/AzurPromilia/comments/1vrm30f/translation_of_the_jp_post/",
      "checkedAt": "2026-09-25",
      "version": "cbt-beta",
      "sourceType": "community",
      "status": "reference"
    }
  },
  {
    "id": "cbt-combat-controls-and-tuning-guide",
    "title": {
      "zh": "CBT 战斗入门：切换、闪避、反制与调谐印记",
      "en": "CBT Combat Primer: Switching, Dodge, Counters, and Tuning Marks",
      "ja": "CBT戦闘入門：交代、回避、反制、調律マーク"
    },
    "summary": {
      "zh": "用测试期资料梳理队伍切换、星鸣/星决、完美闪避与调谐系统的阅读顺序。",
      "en": "A test-period reading order for switching, Resonance/Decision skills, perfect dodges, and Tuning Marks.",
      "ja": "交代、共鳴/決断スキル、ジャスト回避、調律マークをCBT資料で整理します。"
    },
    "content": {
      "zh": "CBT 资料将战斗拆成四个观察层次。第一层是当前角色的普通攻击、重击和星鸣技；第二层是通过攻击、闪避或时间积累后释放的星决技；第三层是角色切换带来的星携技，可能是入场立即释放或留场持续生效；第四层是奇波协作与调谐印记。面对攻击时，先区分可通过防御反制的提示与需要闪避的危险攻击；完美闪避后的反击窗口是测试中应优先练习的基础。调谐印记在 CBT 中可由特定角色或奇波获得，同属性层数存在上限，并可能被特定技能消耗为额外伤害或效果。进入测试时，建议先记录“谁产印记、谁消耗印记、谁受益于切换入场”三个问题，而不是直接套用固定配队。按键、数值、印记效果和可反制提示均可能更新，以游戏内教学为准。",
      "en": "CBT material divides combat into four observation layers. First are the active character’s normal attacks, charged attacks, and Resonance Skill. Second is the Decision Skill, charged through attacks, dodges, or time. Third are switch-triggered Companion Skills, which may fire on entry or persist on the field. Fourth are Kibo cooperation and Tuning Marks. When answering enemy attacks, distinguish attacks that can be countered from hazards that need a dodge; the perfect-dodge counter window is a core test skill worth practicing first. In CBT, certain characters or Kibo gain Tuning Marks, same-element stacks have a cap, and specific skills may consume them for extra damage or effects. During a test, first record who generates marks, who consumes them, and who benefits from switch entry instead of copying a fixed team. Controls, values, mark effects, and counter prompts may change, so follow the in-game tutorial.",
      "ja": "CBT資料では戦闘を4層に分けて観察します。第一は操作キャラの通常攻撃、重撃、共鳴スキル。第二は攻撃、回避、時間経過で溜まる決断スキル。第三は交代で発生する同伴スキルで、入場時に即時発動するものと場に残るものがあります。第四はキボ協力と調律マークです。敵の攻撃には反制できるものと回避すべき危険攻撃があるため、まず区別し、ジャスト回避後の反撃窓を練習します。CBTでは特定のキャラやキボが調律マークを獲得し、同属性の蓄積には上限があり、特定スキルが追加効果のために消費する場合があります。テスト中は固定編成を写す前に、誰がマークを作り、誰が消費し、誰が交代入場で得をするかを記録してください。操作、数値、マーク効果、反制表示は変更される可能性があるため、ゲーム内チュートリアルを優先します。"
    },
    "source": {
      "name": "BWiki help directory and element reference",
      "url": "https://wiki.biligame.com/ap/%E5%B8%AE%E5%8A%A9%E7%9B%AE%E5%BD%95",
      "checkedAt": "2026-09-25",
      "version": "cbt-beta",
      "sourceType": "community",
      "status": "reference"
    }
  },
  {
    "id": "cbt-exploration-tools-mounts-and-resources",
    "title": {
      "zh": "CBT 探索准备：坐骑、采集工具与资源循环",
      "en": "CBT Exploration Prep: Mounts, Gathering Tools, and Resource Loops",
      "ja": "CBT探索準備：騎乗、採集道具、資源循環"
    },
    "summary": {
      "zh": "把探索、工具耐久、资源采集和坐骑用途放在同一条准备清单中。",
      "en": "A single preparation checklist for exploration, tool durability, resource gathering, and mounts.",
      "ja": "探索、道具耐久、資源採集、騎乗用途を一つの準備リストにまとめます。"
    },
    "content": {
      "zh": "测试期探索不要只看角色战斗力。先确认是否携带可用采集工具，并留意工具耐久；纤维、兽皮、木材、石材等基础资源会连接到建设、制作和奇波生产链。坐骑在 CBT 资料中属于具有骑乘天赋的特定奇波，需要完成星结并获得对应鞍具后使用；陆行、飞行、游泳的使用场景不同，不能用单一“跑图最强”结论替代。遇到探索挑战、迷失的息灵或资源点时，优先判断当前缺的是移动方式、工具、还是设施产出，而非立刻消耗稀缺资源。家园采集设施在解锁并派遣合适奇波后可减少手动采集压力，但派遣容量和奇波饱食等规则需在测试内复核。",
      "en": "Do not judge test exploration by character combat alone. First confirm that gathering tools are equipped and watch their durability; basics such as fiber, hide, wood, and stone connect to construction, crafting, and Kibo production loops. In CBT material, mounts are specific Kibo with a riding trait, usable after Star Link and obtaining the matching saddle. Ground, flight, and swimming serve different contexts, so they cannot be replaced by one universal “best traversal” verdict. At exploration challenges, lost wisps, or resource nodes, decide whether the current shortage is mobility, tools, or facility output before spending scarce resources. Homestead gathering facilities can reduce manual gathering after unlocking and dispatching appropriate Kibo, but dispatch capacity and Kibo satiety rules need in-test verification.",
      "ja": "テスト期の探索をキャラ火力だけで判断しません。まず採集道具を持っているか、耐久が残っているかを確認します。繊維、獣皮、木材、石材などの基礎資源は建設、製作、キボ生産の循環につながります。CBT資料では、騎乗は騎乗天賦を持つ特定キボを星結し、対応する鞍を得た後に使えるとされています。陸行、飛行、遊泳は用途が異なるため、一つの「最強移動手段」で置き換えられません。探索チャレンジ、迷子の息霊、資源地点では、希少資源を使う前に、足りないものが移動手段、道具、施設産出のどれかを判断します。拠点の採集施設は解放して適切なキボを派遣すれば手作業を減らせますが、派遣枠と満腹度のルールはテスト内で再確認が必要です。"
    },
    "source": {
      "name": "BWiki help directory",
      "url": "https://wiki.biligame.com/ap/%E5%B8%AE%E5%8A%A9%E7%9B%AE%E5%BD%95",
      "checkedAt": "2026-09-25",
      "version": "cbt-beta",
      "sourceType": "community",
      "status": "reference"
    }
  },
  {
    "id": "cbt-kibo-growth-and-collection-log",
    "title": {
      "zh": "CBT 奇波成长与收集记录法",
      "en": "CBT Kibo Growth and Collection Log",
      "ja": "CBTキボ成長・収集ログの作り方"
    },
    "summary": {
      "zh": "用可复核的记录方式管理捕捉、成长、派遣与骑乘，不把旧测试数据当作固定养成表。",
      "en": "A verifiable way to track capture, growth, dispatch, and mounts without treating old test data as a fixed progression table.",
      "ja": "過去のテストデータを固定育成表にせず、捕獲、成長、派遣、騎乗を検証可能な形で記録します。"
    },
    "content": {
      "zh": "竞品 Wiki 的奇波页覆盖了成长阶段、技能、战斗特性、因子、种族、体型和骑乘，这也是本站后续应持续扩张的数据维度。测试中每获得一只奇波，先记录名称/编号、元素、成长阶段、当前用途、是否可捕捉、派遣设施、生活技能、战斗标签、是否已确认骑乘和信息来源。成长阶段可作为观察字段，但具体等级、材料和技能数值会随着测试版本变化，不应照抄为正式养成成本。若一个奇波同时用于战斗和生产，分别记录两种用途，避免因更换派遣影响队伍判断。带有双元素、特殊体型、成熟体或首领标签的奇波尤其需要记录版本与截图来源。这样在下次测试或正式上线时，可以快速标记哪些结论过期，并将图鉴从“展示列表”升级为“可决策资料”。",
      "en": "Competitor Kibo pages cover growth stages, skills, combat traits, factors, species, size, and mounts. Those are also the data dimensions this site should keep expanding. For each Kibo obtained in a test, record name or number, element, growth stage, current use, catchability, dispatch facility, life skill, combat tag, confirmed mount status, and source. Growth stages can be observed, but exact levels, materials, and skill values change across test builds and should not be copied as release costs. If a Kibo serves both combat and production, record each use separately so dispatch changes do not corrupt team reasoning. Kibo with dual elements, unusual sizes, mature forms, or boss tags especially need a version and screenshot source. This lets the index mark stale conclusions quickly at the next test or release and become a decision tool rather than a display list.",
      "ja": "競合Wikiのキボページは成長段階、スキル、戦闘特性、因子、種族、体型、騎乗まで扱っています。これらは当サイトでも継続して増やすべきデータ軸です。テストでキボを得たら、名称または番号、属性、成長段階、現在の用途、捕獲可否、派遣施設、生活技能、戦闘タグ、騎乗確認状況、出典を記録します。成長段階は観察項目にできますが、必要レベル、素材、スキル数値はテスト版ごとに変わるため正式コストとして写しません。戦闘と生産の両方に使うキボは用途を分けて記録し、派遣変更が編成判断を壊さないようにします。二属性、特殊な体型、成熟体、首領タグを持つキボは、特にバージョンとスクリーンショットの出典が必要です。次のテストや正式配信時に古い結論をすぐ見分け、図鑑を表示リストから判断資料へ更新できます。"
    },
    "source": {
      "name": "BWiki Kibo and growth references",
      "url": "https://wiki.biligame.com/ap/%E5%A5%87%E6%B3%A2",
      "checkedAt": "2026-09-25",
      "version": "cbt-beta",
      "sourceType": "community",
      "status": "reference"
    }
  },
  {
    "id": "cbt-beginner-progression-priorities",
    "title": {
      "zh": "CBT 新手推进优先级：主线、采集设施与奇波分配",
      "en": "CBT Beginner Priorities: Story, Gathering Facilities, and Kibo Dispatch",
      "ja": "CBT初心者の優先順位：メイン任務、採集施設、キボ派遣"
    },
    "summary": {
      "zh": "将竞品站分散的新手内容整理为一条测试期决策路径：先解锁系统，再建立木材、石材与食物供给。",
      "en": "A test-period decision path synthesized from competitor coverage: unlock systems first, then establish wood, stone, and food supply.",
      "ja": "競合サイトに分散している初心者情報を、システム解放から木材・石材・食料供給の構築までのテスト期ルートに整理します。"
    },
    "content": {
      "zh": "以下是 CBT 参考路线，不是正式版任务表。优先推进主线，直到解锁家园、日常与消耗体力的内容；同时完成星途记录中能自然达成的引导目标。开始生产后，先解锁并派遣奇波至伐木场和采石场，解决多数建设与制作的基础材料；接着补采集屋，避免因奇波饱食不足中断派遣。狩猎场和采矿营地用于补皮革、肉与矿石，元素祭坛、饲养场和渔场适合在派遣容量有余、且当前配方确有需求时再投入。星结卡数量有限，早期优先补足能开启生产链或满足当前素材缺口的奇波，而不是平均捕捉所有重复个体。设施开放条件、产量、体力、任务名称与派遣容量均可能在正式版调整，进入测试后请以游戏内说明为准。",
      "en": "This is a CBT reference route, not a release quest list. Advance the main story until homestead, daily, and stamina content unlock, while completing naturally occurring Star Journey Record tutorials. Once production starts, unlock and staff the Logging Camp and Quarry first to cover the materials behind most construction and crafting. Add the Gathering Hut next so Kibo dispatch does not stop from low satiety. Use the Hunting Ground and Mining Camp for leather, meat, and ore; reserve the Element Altar, Feeding Ground, and Fishery for spare dispatch capacity and real recipe demand. Stella Cards are limited, so early capture priority should be Kibo that open a production chain or fill an immediate material gap, not duplicates. Unlock conditions, output, stamina, mission names, and dispatch capacity may change for release; verify every value in-game during a test.",
      "ja": "これは正式版の任務表ではなくCBT参照ルートです。拠点、デイリー、スタミナ消費コンテンツが解放されるまでメイン任務を進め、自然に達成できる星旅記録の導線も消化します。生産が始まったら、建設と製作の基礎素材を確保するため、伐採場と採石場を先に解放してキボを派遣します。次に採集小屋を開け、満腹度不足で派遣が止まるのを防ぎます。狩猟場と採掘場は革、肉、鉱石の補充に使い、元素祭壇、飼育場、漁場は派遣枠に余裕があり、現在必要なレシピがある場合に回します。ステラカードは限られるため、序盤は重複個体を平均的に捕獲するのではなく、生産チェーンの開始や直近の素材不足を解消できるキボを優先します。解放条件、産出量、スタミナ、任務名、派遣枠は正式版で変更される可能性があるため、テスト中はゲーム内説明を確認してください。"
    },
    "source": {
      "name": "GameWith Azur Promilia Beginner Guide",
      "url": "https://gamewith.ai/azurpromilia/en/beginner-guide",
      "checkedAt": "2026-09-25",
      "version": "cbt-beta",
      "sourceType": "cbt",
      "status": "reference"
    }
  },
  {
    "id": "cbt-kibo-capture-growth-mount-dispatch",
    "title": {
      "zh": "CBT 奇波实用指南：捕捉、成长、骑乘与派遣边界",
      "en": "CBT Kibo Field Guide: Capture, Growth, Mounts, and Dispatch",
      "ja": "CBTキボ実用ガイド：捕獲、成長、騎乗、派遣"
    },
    "summary": {
      "zh": "补齐竞品站覆盖较强的奇波决策信息，并将测试版本的可变内容与正式版结论分开。",
      "en": "Fills the Kibo decision gap covered strongly by competitor sites while separating test-build details from release conclusions.",
      "ja": "競合サイトで厚いキボの判断情報を補い、テスト版の内容と正式版の結論を分離します。"
    },
    "content": {
      "zh": "CBT 资料显示，星结使用星结卡进行；降低目标生命值或使用更高稀有度卡片可提高成功率。每只奇波的价值至少应按四件事判断：能否满足当前设施的派遣需求、是否补足队伍的战斗标签、是否具备所需的移动方式，以及是否值得为成长材料继续投入。竞品 Wiki 记录了幼年期、成长期、成熟期和超限体等成长阶段，并指出部分成熟期或超限体可在取得对应鞍具后骑乘；陆行、飞行与游泳能力不应互相替代，洞穴、任务与地图限制也可能影响可用性。资料还将奇波战斗用途拆为独猎、协同、防护、缓冲、领地、变换、猛袭、侵扰、恢复等标签。上述成长、骑乘、技能和标签均来自 CBT/Wiki 参考，不能直接作为正式图鉴、最强奇波或必抓名单。本站建议测试期先按“生产缺口、探索需求、队伍生存或破防缺口”三选一记录自己的捕捉理由，避免把展示用、战斗用和派遣用奇波混为同一优先级。",
      "en": "CBT references describe Star Link capture with Stella Cards; lowering a target’s HP or using a higher-rarity card can improve success. Assess a Kibo through at least four questions: whether it fills the current facility-dispatch need, whether it adds a useful combat tag, whether it supplies a needed traversal method, and whether its growth materials justify continued investment. Competitor wikis record juvenile, growth, mature, and overlimit stages, and say some mature or overlimit Kibo can be mounted after obtaining the corresponding saddle. Ground, flight, and swimming are not interchangeable, and caves, quests, or map limits can restrict use. References also divide combat utility into labels such as solo fighter, combat support, defense support, survival support, territory, disruption, ambush, and healing. Growth, mounts, skills, and tags here are CBT/Wiki references, not a release best-Kibo list. During a test, record each capture under one priority only: production shortage, exploration need, or team survivability/break need. This prevents display, combat, and dispatch Kibo from being treated as the same investment priority.",
      "ja": "CBT資料では、ステラカードで星結を行い、対象HPを下げるか高レアリティのカードを使うと成功率が上がるとされています。キボの価値は、現在の施設派遣の不足を埋めるか、戦闘タグを補うか、必要な移動手段を持つか、成長素材の投資に見合うか、の少なくとも4点で判断します。競合Wikiでは幼年期、成長期、成熟期、超限体が記録され、一部の成熟期または超限体は対応する鞍を得ることで騎乗可能とされています。陸行、飛行、遊泳は相互に代替できず、洞窟、任務、マップ制限で使えない場合もあります。戦闘用途は独獵、協同、防護、緩衝、領地、変換、猛襲、侵擾、回復などのタグに分けられます。ここでの成長、騎乗、技能、タグはCBT/Wiki参照であり、正式版の最強キボ一覧ではありません。テスト中は捕獲ごとに、生産不足、探索需要、チームの生存またはブレイク不足、のどれか一つだけを優先理由として記録してください。展示用、戦闘用、派遣用を同じ投資優先度として混同しないためです。"
    },
    "source": {
      "name": "BWiki Kibo reference",
      "url": "https://wiki.biligame.com/ap/%E5%A5%87%E6%B3%A2",
      "checkedAt": "2026-09-25",
      "version": "cbt-beta",
      "sourceType": "community",
      "status": "reference"
    }
  },
  {
    "id": "latest-test-feedback-and-content-watch",
    "title": {
      "zh": "最新测试内容与社区反馈：探索、Kibo 与移动端体验",
      "en": "Latest Test Content and Community Feedback: Exploration, Kibo, and Mobile Play",
      "ja": "最新テスト内容とコミュニティの反応：探索、キボ、モバイル体験"
    },
    "summary": {
      "zh": "汇总 2026 年 9 月公开试玩报道与社区讨论：新增探索机动性、Kibo 玩法关注，以及移动端操作问题反馈。",
      "en": "A summary of public September 2026 playtest coverage and community discussion: new traversal options, Kibo interest, and mobile-control concerns.",
      "ja": "2026年9月の公開試遊記事とコミュニティの話題を整理。新しい探索アクション、キボ、モバイル操作への関心をまとめます。"
    },
    "content": {
      "zh": "近期公开试玩报道显示，测试版本强化了大世界探索：部分 Kibo 可协助空中移动，主角拥有蹬墙跳等机动方式。讨论热度集中在三类问题：第一，Kibo 是否同时服务于探索、战斗与家园生产；第二，开放世界的移动和收集体验是否足够顺畅；第三，移动端技能断触、操作手感和性能表现能否在后续测试改善。前两类属于可通过试玩观察的内容，第三类来自社区反馈，不能外推为全平台或正式版本结论。当前不应发布角色强度、配队、抽取概率、上线时间或设备配置的确定答案，后续应优先用官方测试公告、招募页和商店页逐项更新。",
      "en": "Recent public playtest coverage indicates that the test build expands open-world traversal: some Kibo can assist aerial movement and the protagonist has wall-jump mobility. Discussion clusters around three questions: whether Kibo support exploration, combat, and homestead production together; whether traversal and collection feel smooth in the open world; and whether mobile missed inputs, controls, and performance improve in later tests. The first two can be observed through playtest material; the third is community feedback and cannot be generalized to every platform or the release build. Do not publish definitive character rankings, team advice, gacha rates, launch timing, or device requirements until official test notices, recruitment pages, and store listings confirm them.",
      "ja": "最近の公開試遊記事では、テスト版でオープンワールド探索が強化され、一部のキボによる空中移動の補助や主人公の壁蹴りジャンプが紹介されています。話題は、キボが探索・戦闘・拠点生産を横断して機能するか、移動と収集の手触り、そしてモバイル版の入力抜け・操作感・性能が次回テストで改善されるか、の3点に集中しています。前2点は試遊資料で確認できますが、最後はコミュニティの感想であり、全プラットフォームや正式版に一般化できません。公式のテスト告知、募集ページ、ストア掲載が確認されるまで、キャラ評価、編成、ガチャ確率、配信時期、端末要件を断定しません。"
    },
    "source": {
      "name": "Gamersky public playtest report",
      "url": "https://www.gamersky.com/news/202609/2204913.shtml",
      "checkedAt": "2026-09-25",
      "version": "cbt-beta",
      "sourceType": "third-party",
      "status": "reference"
    }
  },
  {
    "id": "official-information-checklist",
    "title": {
      "zh": "《蓝色星原：旅谣》官方信息核对清单",
      "en": "Azur Promilia Official Information Checklist",
      "ja": "アズールプロミリア公式情報チェックリスト"
    },
    "summary": {
      "zh": "上线前或版本更新后，用这份清单核对平台、地区、测试资格与公告来源。",
      "en": "Use this checklist to verify platforms, regions, test access, and official announcements before launch or after an update.",
      "ja": "配信前やアップデート後に、対応プラットフォーム、地域、テスト参加条件、公式告知を確認するための一覧です。"
    },
    "content": {
      "zh": "请优先核对游戏官网、官方社交媒体和应用商店页面。测试资格、开放时间、地区限制、设备要求与兑换活动可能变化；本站不会将未证实的传闻作为已确认内容。",
      "en": "Check the official website, official social channels, and app-store listings first. Test access, launch timing, region limits, device requirements, and promotions can change; this site does not treat unverified reports as confirmed facts.",
      "ja": "まず公式サイト、公式SNS、アプリストアの掲載情報を確認してください。テスト参加条件、配信時期、地域制限、端末要件、キャンペーンは変更される場合があります。未確認情報は確定情報として扱いません。"
    }
  },
  {
    "id": "official-character-index",
    "title": {
      "zh": "官方角色图鉴：阿妮斯、卡斯贝尔、辛福莉娅、特拉拉与梅茨娅",
      "en": "Official Character Index: Anais, Cathbelle, Symphoria, Terara, and Metsa",
      "ja": "公式キャラクター一覧：アニス、キャスベル、シンフォーリア、テララ、メーツァ"
    },
    "summary": {
      "zh": "根据日本官方站角色页整理的首批角色介绍；战斗数值与正式版本信息尚未公布。",
      "en": "A first index based on the official Japanese character pages; combat values and release details are not announced.",
      "ja": "日本公式キャラクターページに基づく初期一覧。戦闘数値と正式版情報は未発表です。"
    },
    "content": {
      "zh": "官方站目前介绍了阿妮斯、卡斯贝尔、辛福莉娅、特拉拉和梅茨娅。本文只记录官方人物设定，不推断稀有度、属性、技能、配队或上线版本。",
      "en": "The official site currently introduces Anais, Cathbelle, Symphoria, Terara, and Metsa. This entry records only official profiles and does not infer rarity, element, skills, teams, or release version.",
      "ja": "公式サイトではアニス、キャスベル、シンフォーリア、テララ、メーツァが紹介されています。本項では公式設定のみを記録し、レアリティ、属性、スキル、編成、実装時期は推測しません。"
    }
  },
  {
    "id": "cbt-combat-system-reference",
    "title": {
      "zh": "CBT 战斗系统参考：队伍、技能与调谐印记",
      "en": "CBT Combat System Reference: Teams, Skills, and Tuning Marks",
      "ja": "CBT戦闘システム参照：編成、スキル、調律マーク"
    },
    "summary": {
      "zh": "根据公开 CBT 指南整理的系统摘要，不包含正式数值、配装结论或角色强度排名。",
      "en": "A system summary based on a public CBT guide; it does not include release values, build conclusions, or character rankings.",
      "ja": "公開CBTガイドに基づくシステム概要です。正式数値、ビルド結論、キャラクター順位は含みません。"
    },
    "content": {
      "zh": "CBT 参考资料显示，队伍可由三名角色组成，并搭配一只 Kibo 伙伴。战斗资料将角色按元素、职业与战斗类型区分；常见类型包括攻击手、刺客、坦克、治疗、增益、减益、破防、超限与调谐印记叠层。角色动作会涉及普通攻击、重击、闪避、星之共鸣技、星之决断技、星之同伴技和被动类效果。调谐印记用于记录部分角色在战斗中的积累、消耗或触发条件。上述名称和功能均为 CBT 期间的公开参考，正式版可能重做或改名，因此不应据此推导最终配队、武器选择或强度结论。",
      "en": "CBT references describe a team of up to three characters with one Kibo companion. Combat references classify characters by element, profession, and battle type; common labels include attacker, assassin, tank, healer, buff, debuff, break, overlimit, and Tuning Mark stacking. Character actions can include normal attacks, charged attacks, dodges, Star Resonance skills, Star Decision skills, Star Companion skills, and passives. Tuning Marks stack up to five per element, are shared by the team, gradually expire, and can apply simultaneously across elements. These names and functions are CBT references and may be redesigned or renamed at release, so they should not be used to infer final teams, weapon choices, or power rankings.",
      "ja": "CBT参照資料では、最大3人のキャラクターと1体のキボを編成します。戦闘資料は属性、職業、戦闘タイプでキャラクターを区分し、アタッカー、アサシン、タンク、ヒーラー、バフ、デバフ、ブレイク、オーバーリミット、調律マーク蓄積などが挙げられます。アクションには通常攻撃、重撃、回避、星の共鳴スキル、星の決断スキル、星の同伴スキル、パッシブ系効果が含まれます。調律マークは一部キャラクターの蓄積、消費、発動条件を記録する仕組みです。これらはCBT期の参照情報であり、正式版では設計や名称が変わる場合があるため、最終的な編成、武器選択、強さの結論には使用できません。"
    },
    "source": {
      "name": "GameWith Azur Promilia Beginner Guide",
      "url": "https://gamewith.ai/azurpromilia/en/article/show/52295",
      "checkedAt": "2026-09-10",
      "version": "cbt-beta",
      "sourceType": "cbt",
      "status": "reference"
    }
  },
  {
    "id": "cbt-weapons-and-equipment-reference",
    "title": {
      "zh": "CBT 武器与装备系统参考",
      "en": "CBT Weapons and Equipment Reference",
      "ja": "CBT武器・装備システム参照"
    },
    "summary": {
      "zh": "整理公开 CBT 资料中出现的武器、装备和制作系统；具体名称与数值可能变化。",
      "en": "A reference to weapons, equipment, and crafting systems seen in public CBT materials; names and values may change.",
      "ja": "公開CBT資料に登場した武器、装備、クラフトシステムの参照情報です。名称と数値は変更される場合があります。"
    },
    "content": {
      "zh": "公开 CBT 资料显示，武器不会改变角色外观，并可通过农场与工坊制作或从抽取系统获得。已出现的武器类型包括剑、弓、法杖、长枪、锤等，角色武器适配和具体武器池仍需按测试版本核对。制作系统还涉及武器工作台、护甲工作台、皮革台、纺车、锻造与加工设施；装备资料可能包含武器、胸甲、护腿、戒指、耳饰以及 Stellar Essence 等槽位。当前本站只记录系统级参考，不发布未经逐条核验的武器名称、概率、基础属性或最终配装结论。",
      "en": "Public CBT materials indicate that weapons do not change a character’s appearance and may be crafted through the farm and workshops or obtained through a gacha system. Weapon types seen in references include sword, bow, staff, lance, and hammer, while character compatibility and exact weapon pools must be checked per test build. Crafting references include weapon and armor workbenches, leather stands, spinning wheels, forging, and processing facilities. Equipment references may include weapons, chest pieces, leggings, rings, earrings, and Stellar Essence slots. This site currently records system-level references only and does not publish unverified weapon names, rates, base stats, or final build recommendations.",
      "ja": "公開CBT資料では、武器はキャラクターの見た目を変えず、農場や工房で製作、またはガチャ系システムで入手できるとされています。参照資料には剣、弓、杖、ランス、ハンマーなどの武器種が登場しますが、装備適性と武器プールはテストビルドごとに確認が必要です。製作には武器作業台、防具作業台、革台、糸車、鍛造・加工施設などが関係します。装備枠として武器、胸部、脚部、指輪、耳飾り、Stellar Essenceなどが参照されています。現時点ではシステムレベルの参照情報のみを掲載し、未確認の武器名、確率、基礎属性、最終ビルド結論は掲載しません。"
    },
    "source": {
      "name": "GameWith Azur Promilia Beginner Guide",
      "url": "https://gamewith.ai/azurpromilia/en/beginner-guide",
      "checkedAt": "2026-09-10",
      "version": "cbt-beta",
      "sourceType": "cbt",
      "status": "reference"
    }
  },
  {
    "id": "cbt-kibo-system-reference",
    "title": {
      "zh": "CBT Kibo 伙伴与生产能力参考",
      "en": "CBT Kibo Companion and Production Reference",
      "ja": "CBTキボの仲間・生産能力参照"
    },
    "summary": {
      "zh": "补充 Kibo 的捕捉、战斗协作、进化和农场生产能力。",
      "en": "Covers Kibo capture, combat cooperation, evolution, and farm production utility.",
      "ja": "キボの捕獲、戦闘協力、進化、ファーム生産の機能を整理します。"
    },
    "content": {
      "zh": "Kibo 可使用 Stella Card 进行 Star Link 捕捉；降低目标生命值或使用更高稀有度的 Stella Card 可提高成功率。战斗中每名角色可分配一只 Kibo，当前角色的伙伴会自动加入战斗，并可施放 Kibo Strike。Kibo 还可被派往伐木场、采石场、采集屋、狩猎场、采矿营地、元素祭坛、饲养场和渔场等设施，承担木材、石材、食物、皮革、矿石、元素材料、蛋和鱼类生产。不同 Kibo 具有武器锻造、木工、点火、制甲、浇水等生活技能，进化会改变外观和部分战斗表现。",
      "en": "Kibo can be captured with Stella Cards through Star Link; lowering a target’s HP or using a higher-rarity card improves the success rate. Each character can be assigned one Kibo in battle, and the partner assigned to the active character joins automatically and can use Kibo Strike. Kibo can also be dispatched to logging camps, quarries, gathering huts, hunting grounds, mining camps, element altars, feeding grounds, and fisheries to produce wood, stone, food, leather, ore, elemental materials, eggs, and fish. Different Kibo have life skills such as weaponsmithing, woodworking, ignition, armorsmithing, and watering. Evolution changes appearance and can change combat behavior.",
      "ja": "キボはステラカードでスターリンク捕獲できます。対象のHPを下げるか高レアリティのカードを使うと成功率が上がります。戦闘では各キャラクターに1体のキボを割り当てられ、操作中のキャラクターのパートナーが自動参加してキボストライクを使えます。キボは伐採場、採石場、採集小屋、狩猟場、採掘場、元素祭壇、飼育場、漁場にも派遣でき、木材、石材、食料、革、鉱石、元素素材、卵、魚を生産します。武器鍛造、木工、点火、鎧製作、水やりなどの生活技能を持つ個体もおり、進化で外見や戦闘挙動が変化します。"
    },
    "source": {
      "name": "GameWith Starter Kibo Guide",
      "url": "https://gamewith.ai/azurpromilia/en/starter-kibo",
      "checkedAt": "2026-09-10",
      "version": "cbt-beta",
      "sourceType": "cbt",
      "status": "reference"
    }
  }
];

export type AzurRedeemCode = { code: string; status: 'active' | 'expired' | 'watch'; reward: Record<SupportedLocale, string>; region: string[]; platform: string[]; firstSeenAt?: string; expiresAt?: string; claimConditions: Record<SupportedLocale, string>; source?: { name: string; url: string; checkedAt: string; sourceType: 'official' | 'cbt' | 'community' | 'third-party'; version: 'official' | 'cbt-beta'; status: 'official' | 'reference' | 'unverified' } };
export const redeemCodes: AzurRedeemCode[] = [];

export type AzurVersionEntry = { id: string; label: Record<SupportedLocale, string>; status: 'confirmed' | 'watch'; date?: string; platform: string[]; region: string[]; eligibility: Record<SupportedLocale, string>; downloadStatus: 'available' | 'watch' | 'unavailable'; changeSummary: Record<SupportedLocale, string>; source?: { name: string; url: string; checkedAt: string; sourceType: 'official' | 'cbt' | 'community' | 'third-party'; version: 'official' | 'cbt-beta'; status: 'official' | 'reference' | 'unverified' } };
export const versionTimeline: AzurVersionEntry[] = [
  {
    id: 'post-cbt-improvement-watch',
    label: { zh: 'CBT 后续改进方向', en: 'Post-CBT improvement watch', ja: 'CBT後の改善方針ウォッチ' },
    status: 'watch',
    date: '2026-09',
    platform: [],
    region: [],
    eligibility: { zh: '社区转载的日文公告提及控制器支持、奇波对决、宝箱限制、角色互动和职业平衡等改进方向；等待官方原文与上线版本核验。', en: 'A community translation of a Japanese post mentions controller support, Kibo fights, chest limits, character interaction, and class balance; await the official original and release-build verification.', ja: 'コミュニティ翻訳の日本語投稿では、コントローラー対応、キボ対決、宝箱制限、キャラクター交流、クラスバランスの改善方針が挙げられています。公式原文と正式版での確認待ちです。' },
    downloadStatus: 'watch',
    changeSummary: { zh: '作为反馈追踪项，不将计划中的改进视为已实装功能。', en: 'Tracked as feedback only; planned improvements are not treated as implemented features.', ja: 'フィードバック追跡項目です。予定されている改善を実装済み機能として扱いません。' },
    source: { name: 'Community translation of JP update post', url: 'https://www.reddit.com/r/AzurPromilia/comments/1vrm30f/translation_of_the_jp_post/', checkedAt: '2026-09-25', version: 'cbt-beta', sourceType: 'community', status: 'reference' },
  },
  {
    id: 'september-2026-test-observation',
    label: { zh: '2026 年 9 月公开测试观察', en: 'September 2026 public test observation', ja: '2026年9月の公開テスト観測' },
    status: 'confirmed',
    date: '2026-09',
    platform: [],
    region: [],
    eligibility: { zh: '公开试玩报道确认测试版本存在；具体招募资格、地区与开放时间仍以官方公告为准。', en: 'Public playtest coverage confirms a test build, while recruitment eligibility, regions, and opening times still require official confirmation.', ja: '公開試遊記事でテスト版の存在は確認できますが、募集条件、地域、実施時間は公式告知での確認が必要です。' },
    downloadStatus: 'watch',
    changeSummary: { zh: '试玩报道提及探索机动性调整，包括 Kibo 空中移动辅助与主角蹬墙跳；并非正式版本改动承诺。', en: 'Playtest coverage mentions traversal adjustments, including Kibo-assisted aerial movement and protagonist wall jumps; these are not release commitments.', ja: '試遊記事ではキボによる空中移動補助と主人公の壁蹴りジャンプを含む探索調整が触れられています。正式版への確約ではありません。' },
    source: { name: 'Gamersky public playtest report', url: 'https://www.gamersky.com/news/202609/2204913.shtml', checkedAt: '2026-09-25', version: 'cbt-beta', sourceType: 'third-party', status: 'reference' },
  },
  { id: 'launch-watch', label: { zh: '正式上线时间', en: 'Official launch timing', ja: '正式配信時期' }, status: 'watch', platform: [], region: [], eligibility: { zh: '待官方公告', en: 'Awaiting official announcement', ja: '公式告知待ち' }, downloadStatus: 'watch', changeSummary: { zh: '尚无已核验变更记录', en: 'No verified change history yet', ja: '確認済みの変更履歴はありません' } },
  { id: 'platform-watch', label: { zh: '平台与地区', en: 'Platforms and regions', ja: '対応機種と地域' }, status: 'watch', platform: [], region: [], eligibility: { zh: '待官方公告', en: 'Awaiting official announcement', ja: '公式告知待ち' }, downloadStatus: 'watch', changeSummary: { zh: '尚无已核验变更记录', en: 'No verified change history yet', ja: '確認済みの変更履歴はありません' } },
  { id: 'test-watch', label: { zh: '测试资格与开放时间', en: 'Test access and schedule', ja: 'テスト参加条件と日程' }, status: 'watch', platform: [], region: [], eligibility: { zh: '待官方公告', en: 'Awaiting official announcement', ja: '公式告知待ち' }, downloadStatus: 'watch', changeSummary: { zh: '尚无已核验变更记录', en: 'No verified change history yet', ja: '確認済みの変更履歴はありません' } },
];

export type Kibo = {
  id: string;
  name: Record<SupportedLocale, string>;
  species: Record<SupportedLocale, string>;
  element: string;
  combatSkill: Record<SupportedLocale, string>;
  lifeSkills: string[];
  facilities: string[];
  battleTags: string[];
  catchable: boolean;
  mountType: 'flying' | 'ground' | 'unknown';
  source: { name: string; url: string; checkedAt: string; sourceType: 'official' | 'cbt' | 'community' | 'third-party'; version: 'official' | 'cbt-beta'; status: 'official' | 'reference' | 'unverified' };
  description: Record<SupportedLocale, string>;
};

export const kibo: Kibo[] = [
  { id: 'leaf-fox', name: { zh: '小芽狐', en: 'Leaf Fox', ja: 'コメギツネ' }, species: { zh: '草木族', en: 'Plant clan', ja: '草木族' }, element: 'nature', combatSkill: { zh: '以干扰型协作攻击配合战斗。', en: 'Supports combat with disruption-oriented cooperation.', ja: '妨害型の協力攻撃で戦闘を支援する。' }, lifeSkills: ['weaponsmithing', 'woodworking'], facilities: ['logging-camp', 'sawmill'], battleTags: ['disruption'], catchable: true, mountType: 'ground', source: { name: 'GameWith Kibo index', url: 'https://gamewith.ai/azurpromilia/en/kibos', checkedAt: '2026-09-25', version: 'cbt-beta', sourceType: 'cbt', status: 'reference' }, description: { zh: 'CBT 索引中的木属性奇波；生产与战斗标签需以实际测试版本为准。', en: 'A Nature Kibo in the CBT index; production and combat tags must be confirmed in the active test build.', ja: 'CBT索引にある木属性キボ。生産・戦闘タグは実際のテスト版で確認が必要。' } },
  { id: 'flame-calf', name: { zh: '焰哞哞', en: 'Flame Calf', ja: 'ホムモ' }, species: { zh: '兽形族', en: 'Beast clan', ja: '獣形族' }, element: 'fire', combatSkill: { zh: '偏向单体输出的协作攻击。', en: 'Cooperative attacks oriented toward single-target damage.', ja: '単体火力寄りの協力攻撃。' }, lifeSkills: ['ignition', 'weaponsmithing'], facilities: ['feeding-ground', 'hunting-ground'], battleTags: ['solo-fighter'], catchable: true, mountType: 'unknown', source: { name: 'GameWith Kibo index', url: 'https://gamewith.ai/azurpromilia/en/kibos', checkedAt: '2026-09-25', version: 'cbt-beta', sourceType: 'cbt', status: 'reference' }, description: { zh: '火属性奇波的 CBT 参考记录，适合按点火或单体战斗需求筛选。', en: 'A CBT reference entry for a Fire Kibo; filter it by ignition or single-target combat needs.', ja: '火属性キボのCBT参照記録。点火または単体戦闘の需要で絞り込み可能。' } },
  { id: 'river-beaver', name: { zh: '河狸大师', en: 'River Beaver', ja: 'ビリバー' }, species: { zh: '兽形族', en: 'Beast clan', ja: '獣形族' }, element: 'water', combatSkill: { zh: '提供持续干扰型的水属性协作。', en: 'Provides Water cooperation with sustained disruption.', ja: '持続妨害型の水属性協力を行う。' }, lifeSkills: ['watering', 'armorsmithing'], facilities: ['fishery', 'gathering-hut'], battleTags: ['sustained-disruption'], catchable: true, mountType: 'ground', source: { name: 'GameWith Kibo index', url: 'https://gamewith.ai/azurpromilia/en/kibos', checkedAt: '2026-09-25', version: 'cbt-beta', sourceType: 'cbt', status: 'reference' }, description: { zh: '水域和生产玩法的 CBT 参考入口；是否可骑乘须待正式版本公布鞍具与限制后重新确认。', en: 'A CBT reference for water and production play; mount availability needs release verification once saddles and restrictions are published.', ja: '水上・生産プレイのCBT参照。騎乗可否は正式版で鞍と制限が公開された後に再確認が必要です。' } },
  { id: 'ice-bud', name: { zh: '冰灵芽', en: 'Ice Bud', ja: 'アイシィ' }, species: { zh: '元素族', en: 'Elemental clan', ja: '元素族' }, element: 'ice', combatSkill: { zh: '以持续干扰型协作影响敌方行动。', en: 'Influences enemy actions through sustained-disruption cooperation.', ja: '持続妨害型の協力で敵の行動に干渉する。' }, lifeSkills: ['elemental-work', 'hunting'], facilities: ['element-altar', 'hunting-ground'], battleTags: ['sustained-disruption'], catchable: true, mountType: 'unknown', source: { name: 'GameWith Kibo index', url: 'https://gamewith.ai/azurpromilia/en/kibos', checkedAt: '2026-09-25', version: 'cbt-beta', sourceType: 'cbt', status: 'reference' }, description: { zh: '冰属性奇波的 CBT 索引记录，可作为元素素材与干扰标签的筛选样本。', en: 'A CBT-indexed Ice Kibo, useful as a filter sample for elemental materials and disruption tags.', ja: '氷属性キボのCBT索引記録。元素素材と妨害タグの絞り込み例。' } },
  { id: 'windy', name: { zh: '风灵', en: 'Windy', ja: 'ウィンディ' }, species: { zh: '元素族', en: 'Elemental clan', ja: '元素族' }, element: 'wind', combatSkill: { zh: '提供干扰型风属性协作。', en: 'Provides disruption-oriented Wind cooperation.', ja: '妨害型の風属性協力を行う。' }, lifeSkills: ['elemental-work', 'caretaking'], facilities: ['element-altar', 'feeding-ground'], battleTags: ['disruption'], catchable: true, mountType: 'unknown', source: { name: 'GameWith Kibo index', url: 'https://gamewith.ai/azurpromilia/en/kibos', checkedAt: '2026-09-25', version: 'cbt-beta', sourceType: 'cbt', status: 'reference' }, description: { zh: '风属性奇波的 CBT 索引记录。飞行能力不能由元素或名称推断，需以游戏内状态为准。', en: 'A CBT-indexed Wind Kibo. Flight cannot be inferred from element or name; verify it in-game.', ja: '風属性キボのCBT索引記録。飛行能力は属性や名称から推測せず、ゲーム内で確認。' } },
  { id: 'fumo', name: { zh: '浮云兽', en: 'Fumo', ja: 'フーモ' }, species: { zh: '羽形族', en: 'Wing clan', ja: '羽形族' }, element: 'wind', combatSkill: { zh: '提供战斗支援型协作。', en: 'Provides combat-support cooperation.', ja: '戦闘支援型の協力を行う。' }, lifeSkills: ['field-work'], facilities: ['gathering-hut', 'mining-camp'], battleTags: ['combat-support'], catchable: true, mountType: 'unknown', source: { name: 'GameWith Kibo index', url: 'https://gamewith.ai/azurpromilia/en/kibos', checkedAt: '2026-09-25', version: 'cbt-beta', sourceType: 'cbt', status: 'reference' }, description: { zh: '羽形奇波的 CBT 参考记录，可按野外劳作与战斗支援标签筛选。', en: 'A CBT reference entry for a Wing-clan Kibo, filterable by field work and combat support.', ja: '羽形族キボのCBT参照記録。フィールド作業と戦闘支援で絞り込み可能。' } },
  { id: 'thunder-squirrel', name: { zh: '雷栗鼠', en: 'Thunder Squirrel', ja: 'リーモ' }, species: { zh: '兽形族', en: 'Beast clan', ja: '獣形族' }, element: 'thunder', combatSkill: { zh: '以干扰型雷属性协作参与战斗。', en: 'Joins combat with disruption-oriented Thunder cooperation.', ja: '妨害型の雷属性協力で戦闘に参加する。' }, lifeSkills: ['field-work'], facilities: ['logging-camp', 'mining-camp'], battleTags: ['disruption'], catchable: true, mountType: 'unknown', source: { name: 'GameWith Kibo index', url: 'https://gamewith.ai/azurpromilia/en/kibos', checkedAt: '2026-09-25', version: 'cbt-beta', sourceType: 'cbt', status: 'reference' }, description: { zh: '雷属性奇波的 CBT 索引记录，用于完善元素和设施筛选覆盖。', en: 'A CBT-indexed Thunder Kibo that fills element and facility filter coverage.', ja: '雷属性キボのCBT索引記録。属性・施設フィルターのカバー範囲を補完。' } },
  { id: 'peachy', name: { zh: '桃焰兽', en: 'Peachy', ja: 'ピーチィ' }, species: { zh: '兽形族', en: 'Beast clan', ja: '獣形族' }, element: 'fire', combatSkill: { zh: '偏向伏击型战斗协作。', en: 'Provides ambush-specialist combat cooperation.', ja: '奇襲特化の戦闘協力を行う。' }, lifeSkills: ['ignition', 'hunting'], facilities: ['hunting-ground', 'feeding-ground'], battleTags: ['ambush-specialist'], catchable: true, mountType: 'unknown', source: { name: 'GameWith Kibo index', url: 'https://gamewith.ai/azurpromilia/en/kibos', checkedAt: '2026-09-25', version: 'cbt-beta', sourceType: 'cbt', status: 'reference' }, description: { zh: '火属性伏击标签的 CBT 参考条目；不代表当前版本中的推荐强度。', en: 'A CBT reference for a Fire ambush tag; it is not a current-version recommendation.', ja: '炎属性の奇襲タグに関するCBT参照。現行版の推奨度を示すものではない。' } },
  { id: 'glimmer-ray', name: { zh: '星鳐', en: 'Glimmer Ray', ja: 'ホシエイ' }, species: { zh: '鳞形族', en: 'Scale clan', ja: '鱗形族' }, element: 'light', combatSkill: { zh: '提供生存支援型协作。', en: 'Provides survival-support cooperation.', ja: '生存支援型の協力を行う。' }, lifeSkills: ['weaponsmithing', 'field-work'], facilities: ['fishery', 'gathering-hut'], battleTags: ['survival-support'], catchable: true, mountType: 'unknown', source: { name: 'GameWith Kibo index', url: 'https://gamewith.ai/azurpromilia/en/kibos', checkedAt: '2026-09-25', version: 'cbt-beta', sourceType: 'cbt', status: 'reference' }, description: { zh: '光属性生存支援型奇波的 CBT 参考记录，具体技能效果等待正式测试核验。', en: 'A CBT reference for a Light survival-support Kibo; exact skill effects await release-test verification.', ja: '光属性・生存支援型キボのCBT参照。正確なスキル効果は正式テストで確認待ち。' } },
  { id: 'night-puff', name: { zh: '夜团子', en: 'Night Puff', ja: 'グルル' }, species: { zh: '精怪族', en: 'Spirit clan', ja: '精怪族' }, element: 'dark', combatSkill: { zh: '提供持续干扰型暗属性协作。', en: 'Provides Dark cooperation with sustained disruption.', ja: '持続妨害型の闇属性協力を行う。' }, lifeSkills: ['caretaking'], facilities: ['feeding-ground', 'fishery'], battleTags: ['sustained-disruption'], catchable: true, mountType: 'unknown', source: { name: 'GameWith Kibo index', url: 'https://gamewith.ai/azurpromilia/en/kibos', checkedAt: '2026-09-25', version: 'cbt-beta', sourceType: 'cbt', status: 'reference' }, description: { zh: '暗属性奇波的 CBT 参考记录，用于补齐元素、照料和持续干扰的筛选路径。', en: 'A CBT reference for a Dark Kibo, completing filters for element, caretaking, and sustained disruption.', ja: '闇属性キボのCBT参照。属性、世話、持続妨害の絞り込み経路を補完。' } },
  { id: 'earth-mole', name: { zh: '地灵鼹', en: 'Earth Mole', ja: 'ドゥル' }, species: { zh: '元素族', en: 'Elemental clan', ja: '元素族' }, element: 'earth', combatSkill: { zh: '以干扰型协作参与战斗。', en: 'Participates in combat with disruption-oriented cooperation.', ja: '妨害型の協力で戦闘に参加する。' }, lifeSkills: ['caretaking'], facilities: ['quarry', 'mining-camp'], battleTags: ['disruption'], catchable: true, mountType: 'unknown', source: { name: 'GameWith Kibo index', url: 'https://gamewith.ai/azurpromilia/en/kibos', checkedAt: '2026-09-25', version: 'cbt-beta', sourceType: 'cbt', status: 'reference' }, description: { zh: '地属性奇波的 CBT 参考记录，适合按采石或采矿需求筛选。', en: 'A CBT reference for an Earth Kibo, filterable by quarry or mining needs.', ja: '地属性キボのCBT参照。採石・採掘の需要で絞り込み可能。' } },
  { id: 'staray', name: { zh: '梅特奥尔', en: 'Staray', ja: 'メテオール' }, species: { zh: '鳞形族', en: 'Scale-form clan', ja: '鱗形族' }, element: 'poison', combatSkill: { zh: '释放毒素攻击敌人。', en: 'Releases poison to attack enemies.', ja: '毒を放って敵を攻撃する。' }, lifeSkills: ['watering'], facilities: ['feeding-ground', 'fishery'], battleTags: ['combat-support'], catchable: true, mountType: 'unknown', source: { name: 'Azur Promilia official Kibo page', url: 'https://azurpromilia.jp/kibo', checkedAt: '2026-09-10', version: 'official', sourceType: 'official', status: 'official' }, description: { zh: '官方介绍：拥有强韧翅膀、可以长时间滑翔，并能释放毒素攻击敌人的 Kibo。', en: 'Official profile: a Kibo with strong wings that can glide for long periods and attack with freely released poison.', ja: '公式紹介：強靭な翼で長時間滑空し、毒をまいて敵を攻撃するキボ。' } },
  { id: 'downybrinny', name: { zh: '莫芙琳', en: 'Downybrinny', ja: 'モフリーネ' }, species: { zh: '兽形族', en: 'Beast-form clan', ja: '獣形族' }, element: 'nature', combatSkill: { zh: '以伙伴攻击协助当前角色。', en: 'Assists the active character with a companion attack.', ja: '仲間攻撃で操作キャラクターを支援する。' }, lifeSkills: ['farm labor'], facilities: ['gathering-hut', 'feeding-ground'], battleTags: ['combat-support'], catchable: true, mountType: 'unknown', source: { name: 'Azur Promilia official Kibo page', url: 'https://azurpromilia.jp/kibo', checkedAt: '2026-09-10', version: 'official', sourceType: 'official', status: 'official' }, description: { zh: '官方介绍：数量稀少、拥有八只可以独立活动耳朵的珍稀 Kibo。', en: 'Official profile: a very rare Kibo whose eight ears can move independently.', ja: '公式紹介：個体数が少なく、8つの耳を独立して動かす珍しいキボ。' } },
  { id: 'cabbird', name: { zh: '卡巴德', en: 'Cabbird', ja: 'キャバード' }, species: { zh: '翼形族', en: 'Wing-form clan', ja: '翼形族' }, element: 'wind', combatSkill: { zh: '提供基础 Kibo Strike 协作攻击。', en: 'Provides a basic Kibo Strike companion attack.', ja: '基本的なキボストライクで協力攻撃を行う。' }, lifeSkills: ['woodworking'], facilities: ['logging-camp', 'sawmill'], battleTags: ['combat-support'], catchable: true, mountType: 'unknown', source: { name: 'Azur Promilia official Kibo page', url: 'https://azurpromilia.jp/kibo', checkedAt: '2026-09-10', version: 'official', sourceType: 'official', status: 'official' }, description: { zh: '官方介绍：性格温和、警戒心低，常被智慧种族饲养的 Kibo。', en: 'Official profile: a mild, low-alert Kibo commonly raised by intelligent peoples.', ja: '公式紹介：警戒心が薄く温和で、知的種族によく飼育されるキボ。' } },
  { id: 'bluda', name: { zh: '布鲁达', en: 'Bluda', ja: 'ブルーダ' }, species: { zh: '翼形族', en: 'Wing-form clan', ja: '翼形族' }, element: 'water', combatSkill: { zh: '在水域移动与战斗中提供协作。', en: 'Provides cooperation during water traversal and combat.', ja: '水上移動と戦闘で協力する。' }, lifeSkills: ['watering'], facilities: ['fishery', 'gathering-hut'], battleTags: ['combat-support'], catchable: true, mountType: 'unknown', source: { name: 'Azur Promilia official Kibo page', url: 'https://azurpromilia.jp/kibo', checkedAt: '2026-09-10', version: 'official', sourceType: 'official', status: 'official' }, description: { zh: '官方介绍：外表独特、平衡感较差，可能在水面移动时翻转下沉。', en: 'Official profile: a uniquely shaped Kibo with poor balance that can flip and sink while moving across water.', ja: '公式紹介：ユニークな姿で、バランスが悪く水上移動中にひっくり返ることもあるキボ。' } },
  { id: 'vespervamp', name: { zh: '奈特弗尔', en: 'Vespervamp', ja: 'ナイトフォール' }, species: { zh: '精鬼族', en: 'Spirit-demon clan', ja: '精鬼族' }, element: 'dark', combatSkill: { zh: '通过 Kibo Strike 进行暗属性协作攻击。', en: 'Performs a Dark cooperative attack through Kibo Strike.', ja: 'キボストライクで闇属性の協力攻撃を行う。' }, lifeSkills: ['armorsmithing'], facilities: ['armor-workshop', 'hunting-ground'], battleTags: ['combat-support'], catchable: true, mountType: 'unknown', source: { name: 'Azur Promilia official Kibo page', url: 'https://azurpromilia.jp/kibo', checkedAt: '2026-09-10', version: 'official', sourceType: 'official', status: 'official' }, description: { zh: '官方介绍：容易害怕、性格内向，但闻到感兴趣的食物气味时会展现好战一面。', en: 'Official profile: a shy, easily frightened Kibo that reveals a fierce side when it smells appealing food.', ja: '公式紹介：内向的で怯えやすいが、興味を引く食べ物の匂いには好戦的な一面を見せるキボ。' } },
];

export const worldRegions = [
  { id: 'sprout-valley', name: { zh: '芽吹之谷', en: 'Sprout Valley', ja: '芽吹の谷' }, description: { zh: '绿意环绕、以巨树和山谷为特征的地区。', en: 'A green valley marked by a large tree and forests.', ja: '緑に包まれた渓谷と大きな樹が印象的な地域。' }, landmarks: { zh: ['雾隐森林', '星云菇', '山谷聚落'], en: ['Mist-hidden forest', 'Nebula mushroom', 'Valley settlements'], ja: ['霧隠れの森', 'ネビュラタケ', '谷の集落'] }, associations: { zh: ['自然生态', '奇波活动', '早期探索'], en: ['Natural ecology', 'Kibo activity', 'Early exploration'], ja: ['自然生態', 'キボの活動', '序盤探索'] }, status: 'official' as const },
  { id: 'charlulu-village', name: { zh: '查露露村', en: 'Charlulu Village', ja: 'シャルル村' }, description: { zh: '芽吹之谷西南的兽人聚落，也是特拉拉的故乡。', en: 'A beastfolk settlement southwest of Sprout Valley and Terara’s home.', ja: '芽吹の谷南西にある獣人族の村で、テララの故郷。' }, landmarks: { zh: ['狩猎与采集聚落', '群狼传说'], en: ['Hunting and gathering settlement', 'Wolf-pack legend'], ja: ['狩猟・採集の集落', '群狼の伝承'] }, associations: { zh: ['特拉拉', '兽人族', '狩猎'], en: ['Terara', 'Beastfolk', 'Hunting'], ja: ['テララ', '獣人族', '狩猟'] }, status: 'official' as const },
  { id: 'jinghua-cape', name: { zh: '镜花州', en: 'Jinghua Cape', ja: '鏡花州' }, description: { zh: '以东方建筑、水乡景观和天花祭闻名的地区。', en: 'A region known for East-Asian-inspired architecture, waterways, and the Tenka Festival.', ja: '東方風の建築、水郷、天花祭で知られる地域。' }, landmarks: { zh: ['天花祭', '朔之濑', '吉逸楼'], en: ['Tenka Festival', 'Saku no Se', 'Kichiitsu Tower'], ja: ['天花祭', '朔の瀬', '吉逸楼'] }, associations: { zh: ['寒悠悠', '花与节庆', '水乡'], en: ['Han Youyou', 'Flowers and festival', 'Water town'], ja: ['寒悠悠', '花と祭り', '水郷'] }, status: 'official' as const },
  { id: 'reave', name: { zh: '雷夫', en: 'Reave', ja: 'レーブ' }, description: { zh: '带有机械文明气息的未知工业城市，官方描述仍强调其尚待探索。', en: 'An unknown industrial city with a mechanical-civilization feel, still described by the official site as unexplored.', ja: '機械文明の気配を持つ未知の工業都市。公式サイトでも未探索と説明されています。' }, landmarks: { zh: ['工业城市', '机械文明'], en: ['Industrial city', 'Mechanical civilization'], ja: ['工業都市', '機械文明'] }, associations: { zh: ['后续区域观察', '地图与开放条件待确认'], en: ['Future-region watch', 'Map and access pending'], ja: ['今後の地域観測', 'マップ・解放条件は確認待ち'] }, status: 'watch' as const },
  { id: 'fris', name: { zh: '弗里斯', en: 'Fris', ja: 'フリス' }, description: { zh: '草原、贸易、圆环遗迹和热气球市集共同构成的城市地区。', en: 'A city region shaped by grasslands, trade, ring-like ruins, and a balloon market.', ja: '草原、交易、環状遺跡、気球市場で形作られる都市地域。' }, landmarks: { zh: ['丰收大厅拍卖场', '梅梅屋', '广场市集', '第三纪元圆环遗迹'], en: ['Harvest Hall auction house', 'Meimei House', 'Plaza market', 'Third-era ring ruins'], ja: ['ハーベストホール', 'メイメイハウス', '広場の市場', '第三紀元の環状遺跡'] }, associations: { zh: ['阿妮斯', '卡斯贝尔', '贸易与饮食'], en: ['Anais', 'Cathbelle', 'Trade and dining'], ja: ['アニス', 'キャスベル', '交易と食'] }, status: 'official' as const },
];

export function gameName(locale: SupportedLocale) {
  return { zh: '蓝色星原：旅谣', en: 'Azur Promilia', ja: 'アズールプロミリア' }[locale];
}

export function characterName(character: (typeof characters)[number], locale: SupportedLocale) {
  return character.name[locale];
}

export function weaponName(weapon: (typeof weapons)[number], locale: SupportedLocale) {
  return weapon.name[locale];
}
