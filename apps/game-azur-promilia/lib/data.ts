import { characters, tierLists, weapons } from '@gachia/data/games/azur-promilia';
import type { SupportedLocale } from '@gachia/core';

export { characters, tierLists, weapons };

export type Guide = {
  id: string;
  title: Record<SupportedLocale, string>;
  summary: Record<SupportedLocale, string>;
  content: Record<SupportedLocale, string>;
  source?: { name: string; url: string; checkedAt: string; version: 'official' | 'cbt-beta' };
};

export const guides: Guide[] = [
  {
    id: 'official-information-checklist',
    title: {
      zh: '《蓝色星原：旅谣》官方信息核对清单',
      en: 'Azur Promilia Official Information Checklist',
      ja: 'アズールプロミリア公式情報チェックリスト',
    },
    summary: {
      zh: '上线前或版本更新后，用这份清单核对平台、地区、测试资格与公告来源。',
      en: 'Use this checklist to verify platforms, regions, test access, and official announcements before launch or after an update.',
      ja: '配信前やアップデート後に、対応プラットフォーム、地域、テスト参加条件、公式告知を確認するための一覧です。',
    },
    content: {
      zh: '请优先核对游戏官网、官方社交媒体和应用商店页面。测试资格、开放时间、地区限制、设备要求与兑换活动可能变化；本站不会将未证实的传闻作为已确认内容。',
      en: 'Check the official website, official social channels, and app-store listings first. Test access, launch timing, region limits, device requirements, and promotions can change; this site does not treat unverified reports as confirmed facts.',
      ja: 'まず公式サイト、公式SNS、アプリストアの掲載情報を確認してください。テスト参加条件、配信時期、地域制限、端末要件、キャンペーンは変更される場合があります。未確認情報は確定情報として扱いません。',
    },
  },
  {
    id: 'official-character-index',
    title: {
      zh: '官方角色图鉴：阿妮斯、卡斯贝尔、辛福莉娅、特拉拉与梅茨娅',
      en: 'Official Character Index: Anais, Cathbelle, Symphoria, Terara, and Metsa',
      ja: '公式キャラクター一覧：アニス、キャスベル、シンフォーリア、テララ、メーツァ',
    },
    summary: {
      zh: '根据日本官方站角色页整理的首批角色介绍；战斗数值与正式版本信息尚未公布。',
      en: 'A first index based on the official Japanese character pages; combat values and release details are not announced.',
      ja: '日本公式キャラクターページに基づく初期一覧。戦闘数値と正式版情報は未発表です。',
    },
    content: {
      zh: '官方站目前介绍了阿妮斯、卡斯贝尔、辛福莉娅、特拉拉和梅茨娅。本文只记录官方人物设定，不推断稀有度、属性、技能、配队或上线版本。',
      en: 'The official site currently introduces Anais, Cathbelle, Symphoria, Terara, and Metsa. This entry records only official profiles and does not infer rarity, element, skills, teams, or release version.',
      ja: '公式サイトではアニス、キャスベル、シンフォーリア、テララ、メーツァが紹介されています。本項では公式設定のみを記録し、レアリティ、属性、スキル、編成、実装時期は推測しません。',
    },
  },
  {
    id: 'cbt-combat-system-reference',
    title: {
      zh: 'CBT 战斗系统参考：队伍、技能与调谐印记',
      en: 'CBT Combat System Reference: Teams, Skills, and Tuning Marks',
      ja: 'CBT戦闘システム参照：編成、スキル、調律マーク',
    },
    summary: {
      zh: '根据公开 CBT 指南整理的系统摘要，不包含正式数值、配装结论或角色强度排名。',
      en: 'A system summary based on a public CBT guide; it does not include release values, build conclusions, or character rankings.',
      ja: '公開CBTガイドに基づくシステム概要です。正式数値、ビルド結論、キャラクター順位は含みません。',
    },
    content: {
      zh: 'CBT 参考资料显示，队伍可由三名角色组成，并搭配一只 Kibo 伙伴。战斗资料将角色按元素、职业与战斗类型区分；常见类型包括攻击手、刺客、坦克、治疗、增益、减益、破防、超限与调谐印记叠层。角色动作会涉及普通攻击、重击、闪避、星之共鸣技、星之决断技、星之同伴技和被动类效果。调谐印记用于记录部分角色在战斗中的积累、消耗或触发条件。上述名称和功能均为 CBT 期间的公开参考，正式版可能重做或改名，因此不应据此推导最终配队、武器选择或强度结论。',
      en: 'CBT references describe a team of up to three characters with one Kibo companion. Combat references classify characters by element, profession, and battle type; common labels include attacker, assassin, tank, healer, buff, debuff, break, overlimit, and Tuning Mark stacking. Character actions can include normal attacks, charged attacks, dodges, Star Resonance skills, Star Decision skills, Star Companion skills, and passives. Tuning Marks stack up to five per element, are shared by the team, gradually expire, and can apply simultaneously across elements. These names and functions are CBT references and may be redesigned or renamed at release, so they should not be used to infer final teams, weapon choices, or power rankings.',
      ja: 'CBT参照資料では、最大3人のキャラクターと1体のキボを編成します。戦闘資料は属性、職業、戦闘タイプでキャラクターを区分し、アタッカー、アサシン、タンク、ヒーラー、バフ、デバフ、ブレイク、オーバーリミット、調律マーク蓄積などが挙げられます。アクションには通常攻撃、重撃、回避、星の共鳴スキル、星の決断スキル、星の同伴スキル、パッシブ系効果が含まれます。調律マークは一部キャラクターの蓄積、消費、発動条件を記録する仕組みです。これらはCBT期の参照情報であり、正式版では設計や名称が変わる場合があるため、最終的な編成、武器選択、強さの結論には使用できません。',
    },
    source: {
      name: 'GameWith Azur Promilia Beginner Guide',
      url: 'https://gamewith.ai/azurpromilia/en/article/show/52295',
      checkedAt: '2026-09-10',
      version: 'cbt-beta',
    },
  },
  {
    id: 'cbt-weapons-and-equipment-reference',
    title: {
      zh: 'CBT 武器与装备系统参考',
      en: 'CBT Weapons and Equipment Reference',
      ja: 'CBT武器・装備システム参照',
    },
    summary: {
      zh: '整理公开 CBT 资料中出现的武器、装备和制作系统；具体名称与数值可能变化。',
      en: 'A reference to weapons, equipment, and crafting systems seen in public CBT materials; names and values may change.',
      ja: '公開CBT資料に登場した武器、装備、クラフトシステムの参照情報です。名称と数値は変更される場合があります。',
    },
    content: {
      zh: '公开 CBT 资料显示，武器不会改变角色外观，并可通过农场与工坊制作或从抽取系统获得。已出现的武器类型包括剑、弓、法杖、长枪、锤等，角色武器适配和具体武器池仍需按测试版本核对。制作系统还涉及武器工作台、护甲工作台、皮革台、纺车、锻造与加工设施；装备资料可能包含武器、胸甲、护腿、戒指、耳饰以及 Stellar Essence 等槽位。当前本站只记录系统级参考，不发布未经逐条核验的武器名称、概率、基础属性或最终配装结论。',
      en: 'Public CBT materials indicate that weapons do not change a character’s appearance and may be crafted through the farm and workshops or obtained through a gacha system. Weapon types seen in references include sword, bow, staff, lance, and hammer, while character compatibility and exact weapon pools must be checked per test build. Crafting references include weapon and armor workbenches, leather stands, spinning wheels, forging, and processing facilities. Equipment references may include weapons, chest pieces, leggings, rings, earrings, and Stellar Essence slots. This site currently records system-level references only and does not publish unverified weapon names, rates, base stats, or final build recommendations.',
      ja: '公開CBT資料では、武器はキャラクターの見た目を変えず、農場や工房で製作、またはガチャ系システムで入手できるとされています。参照資料には剣、弓、杖、ランス、ハンマーなどの武器種が登場しますが、装備適性と武器プールはテストビルドごとに確認が必要です。製作には武器作業台、防具作業台、革台、糸車、鍛造・加工施設などが関係します。装備枠として武器、胸部、脚部、指輪、耳飾り、Stellar Essenceなどが参照されています。現時点ではシステムレベルの参照情報のみを掲載し、未確認の武器名、確率、基礎属性、最終ビルド結論は掲載しません。',
    },
    source: {
      name: 'GameWith Azur Promilia Beginner Guide',
      url: 'https://gamewith.ai/azurpromilia/en/beginner-guide',
      checkedAt: '2026-09-10',
      version: 'cbt-beta',
    },
  },
  {
    id: 'cbt-kibo-system-reference',
    title: {
      zh: 'CBT Kibo 伙伴与生产能力参考',
      en: 'CBT Kibo Companion and Production Reference',
      ja: 'CBTキボの仲間・生産能力参照',
    },
    summary: {
      zh: '补充 Kibo 的捕捉、战斗协作、进化和农场生产能力。',
      en: 'Covers Kibo capture, combat cooperation, evolution, and farm production utility.',
      ja: 'キボの捕獲、戦闘協力、進化、ファーム生産の機能を整理します。',
    },
    content: {
      zh: 'Kibo 可使用 Stella Card 进行 Star Link 捕捉；降低目标生命值或使用更高稀有度的 Stella Card 可提高成功率。战斗中每名角色可分配一只 Kibo，当前角色的伙伴会自动加入战斗，并可施放 Kibo Strike。Kibo 还可被派往伐木场、采石场、采集屋、狩猎场、采矿营地、元素祭坛、饲养场和渔场等设施，承担木材、石材、食物、皮革、矿石、元素材料、蛋和鱼类生产。不同 Kibo 具有武器锻造、木工、点火、制甲、浇水等生活技能，进化会改变外观和部分战斗表现。',
      en: 'Kibo can be captured with Stella Cards through Star Link; lowering a target’s HP or using a higher-rarity card improves the success rate. Each character can be assigned one Kibo in battle, and the partner assigned to the active character joins automatically and can use Kibo Strike. Kibo can also be dispatched to logging camps, quarries, gathering huts, hunting grounds, mining camps, element altars, feeding grounds, and fisheries to produce wood, stone, food, leather, ore, elemental materials, eggs, and fish. Different Kibo have life skills such as weaponsmithing, woodworking, ignition, armorsmithing, and watering. Evolution changes appearance and can change combat behavior.',
      ja: 'キボはステラカードでスターリンク捕獲できます。対象のHPを下げるか高レアリティのカードを使うと成功率が上がります。戦闘では各キャラクターに1体のキボを割り当てられ、操作中のキャラクターのパートナーが自動参加してキボストライクを使えます。キボは伐採場、採石場、採集小屋、狩猟場、採掘場、元素祭壇、飼育場、漁場にも派遣でき、木材、石材、食料、革、鉱石、元素素材、卵、魚を生産します。武器鍛造、木工、点火、鎧製作、水やりなどの生活技能を持つ個体もおり、進化で外見や戦闘挙動が変化します。',
    },
    source: {
      name: 'GameWith Starter Kibo Guide',
      url: 'https://gamewith.ai/azurpromilia/en/starter-kibo',
      checkedAt: '2026-09-10',
      version: 'cbt-beta',
    },
  },
];

export const redeemCodes: Array<{ code: string; status: 'watch'; reward: Record<SupportedLocale, string> }> = [];

export type Kibo = {
  id: string;
  name: Record<SupportedLocale, string>;
  species: Record<SupportedLocale, string>;
  element: string;
  combatSkill: Record<SupportedLocale, string>;
  lifeSkills: string[];
  facilities: string[];
  source: { name: string; url: string; checkedAt: string; version: 'official' | 'cbt-beta' };
  description: Record<SupportedLocale, string>;
};

export const kibo: Kibo[] = [
  { id: 'staray', name: { zh: '梅特奥尔', en: 'Staray', ja: 'メテオール' }, species: { zh: '鳞形族', en: 'Scale-form clan', ja: '鱗形族' }, element: 'poison', combatSkill: { zh: '释放毒素攻击敌人。', en: 'Releases poison to attack enemies.', ja: '毒を放って敵を攻撃する。' }, lifeSkills: ['watering'], facilities: ['feeding-ground', 'fishery'], source: { name: 'Azur Promilia official Kibo page', url: 'https://azurpromilia.jp/kibo', checkedAt: '2026-09-10', version: 'official' }, description: { zh: '官方介绍：拥有强韧翅膀、可以长时间滑翔，并能释放毒素攻击敌人的 Kibo。', en: 'Official profile: a Kibo with strong wings that can glide for long periods and attack with freely released poison.', ja: '公式紹介：強靭な翼で長時間滑空し、毒をまいて敵を攻撃するキボ。' } },
  { id: 'downybrinny', name: { zh: '莫芙琳', en: 'Downybrinny', ja: 'モフリーネ' }, species: { zh: '兽形族', en: 'Beast-form clan', ja: '獣形族' }, element: 'nature', combatSkill: { zh: '以伙伴攻击协助当前角色。', en: 'Assists the active character with a companion attack.', ja: '仲間攻撃で操作キャラクターを支援する。' }, lifeSkills: ['farm labor'], facilities: ['gathering-hut', 'feeding-ground'], source: { name: 'Azur Promilia official Kibo page', url: 'https://azurpromilia.jp/kibo', checkedAt: '2026-09-10', version: 'official' }, description: { zh: '官方介绍：数量稀少、拥有八只可以独立活动耳朵的珍稀 Kibo。', en: 'Official profile: a very rare Kibo whose eight ears can move independently.', ja: '公式紹介：個体数が少なく、8つの耳を独立して動かす珍しいキボ。' } },
  { id: 'cabbird', name: { zh: '卡巴德', en: 'Cabbird', ja: 'キャバード' }, species: { zh: '翼形族', en: 'Wing-form clan', ja: '翼形族' }, element: 'wind', combatSkill: { zh: '提供基础 Kibo Strike 协作攻击。', en: 'Provides a basic Kibo Strike companion attack.', ja: '基本的なキボストライクで協力攻撃を行う。' }, lifeSkills: ['woodworking'], facilities: ['logging-camp', 'sawmill'], source: { name: 'Azur Promilia official Kibo page', url: 'https://azurpromilia.jp/kibo', checkedAt: '2026-09-10', version: 'official' }, description: { zh: '官方介绍：性格温和、警戒心低，常被智慧种族饲养的 Kibo。', en: 'Official profile: a mild, low-alert Kibo commonly raised by intelligent peoples.', ja: '公式紹介：警戒心が薄く温和で、知的種族によく飼育されるキボ。' } },
  { id: 'bluda', name: { zh: '布鲁达', en: 'Bluda', ja: 'ブルーダ' }, species: { zh: '翼形族', en: 'Wing-form clan', ja: '翼形族' }, element: 'water', combatSkill: { zh: '在水域移动与战斗中提供协作。', en: 'Provides cooperation during water traversal and combat.', ja: '水上移動と戦闘で協力する。' }, lifeSkills: ['watering'], facilities: ['fishery', 'gathering-hut'], source: { name: 'Azur Promilia official Kibo page', url: 'https://azurpromilia.jp/kibo', checkedAt: '2026-09-10', version: 'official' }, description: { zh: '官方介绍：外表独特、平衡感较差，可能在水面移动时翻转下沉。', en: 'Official profile: a uniquely shaped Kibo with poor balance that can flip and sink while moving across water.', ja: '公式紹介：ユニークな姿で、バランスが悪く水上移動中にひっくり返ることもあるキボ。' } },
  { id: 'vespervamp', name: { zh: '奈特弗尔', en: 'Vespervamp', ja: 'ナイトフォール' }, species: { zh: '精鬼族', en: 'Spirit-demon clan', ja: '精鬼族' }, element: 'dark', combatSkill: { zh: '通过 Kibo Strike 进行暗属性协作攻击。', en: 'Performs a Dark cooperative attack through Kibo Strike.', ja: 'キボストライクで闇属性の協力攻撃を行う。' }, lifeSkills: ['armorsmithing'], facilities: ['armor-workshop', 'hunting-ground'], source: { name: 'Azur Promilia official Kibo page', url: 'https://azurpromilia.jp/kibo', checkedAt: '2026-09-10', version: 'official' }, description: { zh: '官方介绍：容易害怕、性格内向，但闻到感兴趣的食物气味时会展现好战一面。', en: 'Official profile: a shy, easily frightened Kibo that reveals a fierce side when it smells appealing food.', ja: '公式紹介：内向的で怯えやすいが、興味を引く食べ物の匂いには好戦的な一面を見せるキボ。' } },
];

export const worldRegions = [
  { id: 'sprout-valley', name: { zh: '芽吹之谷', en: 'Sprout Valley', ja: '芽吹の谷' }, description: { zh: '绿意环绕、以巨树和山谷为特征的地区。', en: 'A green valley marked by a large tree and forests.', ja: '緑に包まれた渓谷と大きな樹が印象的な地域。' } },
  { id: 'charlulu-village', name: { zh: '查露露村', en: 'Charlulu Village', ja: 'シャルル村' }, description: { zh: '特拉拉的故乡，位于芽吹之谷西南的兽人聚落。', en: 'Terara’s home, a beastfolk settlement southwest of Sprout Valley.', ja: 'テララの故郷で、芽吹の谷南西にある獣人族の村。' } },
  { id: 'jinghua-cape', name: { zh: '镜花州', en: 'Jinghua Cape', ja: '鏡花州' }, description: { zh: '拥有东方风格建筑与水乡景观的地区，天花祭在此举行。', en: 'A region with East-Asian-inspired architecture and waterways, home to the Tenka Festival.', ja: '東方風の建築と水郷の景観が広がり、天花祭が行われる地域。' } },
  { id: 'reave', name: { zh: '雷夫', en: 'Reave', ja: 'レーブ' }, description: { zh: '仍待探索的工业城市，带有浓厚的机械文明气息。', en: 'An unexplored industrial city with traces of mechanical civilization.', ja: '機械文明の気配が漂う、まだ探索できていない工業都市。' } },
  { id: 'fris', name: { zh: '弗里斯', en: 'Fris', ja: 'フリス' }, description: { zh: '以草原、贸易和环形遗迹闻名的城市地区。', en: 'A trade city known for open grasslands and fragments of circular ruins.', ja: '草原、交易、環状遺跡の断片で知られる都市。' } },
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
