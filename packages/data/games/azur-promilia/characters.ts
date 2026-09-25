import type { SupportedLocale } from '@gachia/core';
import type { AzurPromiliaBetaProfile, AzurPromiliaCharacter, AzurPromiliaSkillSummary, AzurPromiliaSource } from './types';

export const officialSource: AzurPromiliaSource = {
  name: 'Azur Promilia official Japanese character page',
  url: 'https://azurpromilia.jp/character',
  checkedAt: '2026-09-10',
  version: 'official',
  sourceType: 'official',
  status: 'official',
};

export const betaSource: AzurPromiliaSource = {
  name: 'GameWith Azur Promilia character index',
  url: 'https://gamewith.ai/azurpromilia/en/characters',
  checkedAt: '2026-09-10',
  version: 'cbt-beta',
  sourceType: 'cbt',
  status: 'reference',
};

type Names = Record<SupportedLocale, string>;

const localized = (zh: string, en: string, ja: string): Names => ({ zh, en, ja });

const skill = (id: string, name: Names, description: Names, cooldown?: string, energyCost?: string): AzurPromiliaSkillSummary => ({
  id,
  category: id === 'normal-attack' ? 'normal' : id === 'star-resonance' ? 'resonance' : id === 'star-decision' ? 'decision' : id === 'star-companion' ? 'companion' : id === 'star-blessing' ? 'blessing' : 'reference',
  name,
  description,
  cooldown,
  energyCost,
});

const beta = (
  element: string,
  profession: string,
  rarity: 4 | 5,
  weaponType: string,
  region: string,
  battleTypes: string[],
  tuningMarks: Partial<AzurPromiliaBetaProfile['tuningMarks']> = {},
  skills: AzurPromiliaBetaProfile['skills'] = [],
): AzurPromiliaBetaProfile => ({
  element,
  profession,
  rarity,
  weaponType,
  region,
  cbtVersion: 'CBT2 reference',
  battleTypes,
  tuningMarks: {
    gains: tuningMarks.gains ?? [],
    consumes: tuningMarks.consumes ?? [],
    requires: tuningMarks.requires ?? [],
  },
  source: betaSource,
  skills,
});

const betaLegacy = (
  element: string,
  profession: string,
  rarity: 4 | 5,
  battleTypes: string[],
  tuningMarks: Partial<AzurPromiliaBetaProfile['tuningMarks']>,
  skills: AzurPromiliaBetaProfile['skills'] = [],
): AzurPromiliaBetaProfile => beta(element, profession, rarity, 'unknown', 'unknown', battleTypes, tuningMarks, skills);

// Compatibility fallback for entries whose weapon/region facts are not yet in the index.
const normalizeBeta = (value: AzurPromiliaBetaProfile): AzurPromiliaBetaProfile => ({ ...value, weaponType: value.weaponType || 'unknown', region: value.region || 'unknown' });

const profile = (
  id: string,
  name: Names,
  description: Names,
  profile: AzurPromiliaBetaProfile,
  hasOfficialProfile = false,
  officialRegion?: string,
): AzurPromiliaCharacter => ({
  id,
  gameId: 'azur-promilia',
  name,
  rarity: profile.rarity,
  element: profile.element,
  weaponType: profile.weaponType,
  description,
  images: { icon: '', card: '', gachaSplash: '' },
  stats: { baseHp: [], baseAtk: [], baseDef: [] },
  materials: [],
  skills: [],
  releaseVersion: hasOfficialProfile ? 'unannounced' : 'cbt-reference',
  officialSource: hasOfficialProfile ? officialSource : undefined,
  officialVisualUrl: hasOfficialProfile ? `https://azurpromilia.jp/character/${id}` : undefined,
  officialRegion,
  beta: normalizeBeta(profile),
});

const genericSkill = (role: string, note: Names) => [
  skill('normal-attack', localized('普通攻击', 'Normal Attack', '通常攻撃'), localized('CBT 索引确认该角色以普通攻击或重击参与战斗；详细动作待逐帧核验。', 'The CBT index confirms normal or charged combat participation; the detailed move string awaits frame-by-frame verification.', 'CBT索引では通常攻撃または重撃で戦闘に参加することを確認。詳細なモーションは検証待ち。')),
  skill('star-resonance', localized('星之共鸣技', 'Star Resonance Skill', '星の共鳴スキル'), localized('具有冷却时间的主动技能；具体倍率与冷却待版本核对。', 'An active skill with a cooldown; exact multipliers and cooldown await version verification.', 'クールダウンを持つアクティブスキル。詳細な倍率とCTはバージョン確認待ち。')),
  skill('star-decision', localized('星之决断技', 'Star Decision Skill', '星の決断スキル'), localized('通过战斗获得能量后施放的爆发技能；能量数值待核对。', 'A burst skill used after gaining energy in combat; energy values await verification.', '戦闘で得たエネルギーを消費するバーストスキル。必要量は確認待ち。')),
  skill('star-companion', localized('星之同伴技', 'Star Companion Skill', '星の同伴スキル'), localized('角色切换时触发的协作技能，可能在入场或退场时生效。', 'A cooperative switch skill that may activate on entry or exit.', 'キャラクター交代時に発動する協力スキル。登場時または退場時に発動する場合がある。')),
  skill('star-blessing', localized('星之祝福', 'Star Blessing', '星の祝福'), localized(`CBT 索引标注定位：${role}。`, `The CBT index lists this character as ${role}.`, `CBT索引での役割：${role}。`)),
];

const withBlessing = (skills: AzurPromiliaSkillSummary[], description: Names) => [...skills, skill('star-blessing', localized('星之祝福', 'Star Blessing', '星の祝福'), description)];

export const cbtBlessings: Record<string, Names> = {
  'morwyn-halkon': localized('超限伤害提高 54%。', 'Overlimit damage increases by 54%.', 'オーバーリミットダメージが54%上昇。'),
  ruby: localized('每层“Red Hot”使调谐强度提高 20，持续 15 秒，最多 6 层。', 'Each Red Hot stack increases Tuning Strength by 20 for 15 seconds, up to 6 stacks.', 'Red Hot 1層ごとに調律強度+20（15秒、最大6層）。'),
  'shalle-ensys': localized('星之共鸣技最后一击命中后，攻击力提高 20%，持续 16 秒。', 'After the final hit of Star Resonance Skill hits, ATK increases by 20% for 16 seconds.', '星の共鳴スキル最終段命中後、攻撃力20%上昇（16秒）。'),
  xiaoyu: localized('触发重击、完美招架或同伴/决断技时，调谐强度提高 32%、攻击力提高 5%，最多 4 层。', 'Charged attacks, perfect parries, Companion or Decision Skills grant 32% Tuning Strength and 5% ATK for 8 seconds, up to 4 stacks.', '重撃、ジャストパリィ、同伴/決断スキルで調律強度32%、攻撃力5%上昇（8秒、最大4層）。'),
  anais: localized('治疗生命值不高于 30% 的队友时，治疗效果提高 100%。', 'Healing effectiveness increases by 100% when healing an ally at 30% HP or less.', 'HP30%以下の味方を回復すると回復効果が100%上昇。'),
  cathbelle: localized('特殊重击第 2 或第 3 段命中时，共鸣技冷却缩短 3 秒。', 'Hitting with the second or third hit of Special Charged Attack reduces Resonance Skill cooldown by 3 seconds.', '特殊重撃の2段目または3段目命中時、共鳴スキルCTを3秒短縮。'),
  'han-youyou': localized('Enka 爆炸后，当前角色攻击力提高 10%，持续 24 秒。', 'After an Enka explosion, the active character gains 10% ATK for 24 seconds.', 'Enka爆発後、操作キャラクターの攻撃力10%上昇（24秒）。'),
  katalua: localized('获得护盾时，使当前角色攻击力提高，持续 20 秒。', 'Gaining a shield increases the active character’s ATK for 20 seconds.', 'シールド獲得時、操作キャラクターの攻撃力上昇（20秒）。'),
  lily: localized('完美防御反击命中后，获得 2 层风调谐印记。', 'A successful perfect-guard counter grants 2 Wind Tuning Marks.', 'ジャストガード反撃命中時、風の調律マークを2獲得。'),
  mitty: localized('共鸣技可持续恢复全队决断能量，并在第二触发后提高当前角色攻击力。', 'Resonance Skill restores team Decision Charge over time; the second trigger also increases active-character ATK.', '共鳴スキルで全体の決断チャージを継続回復し、2回目の発動で操作キャラクターの攻撃力上昇。'),
  nono: localized('完全蓄力重击最后一击命中后，全队攻击力提高 4%，持续 6 秒。', 'The final hit of a fully charged attack increases team ATK by 4% for 6 seconds.', '最大溜め重撃の最終段命中後、全体攻撃力4%上昇（6秒）。'),
  pengpeng: localized('从第 4 次普通攻击开始，暴击率提高 30%，持续 6 秒。', 'Starting from the fourth normal attack, CRIT Rate increases by 30% for 6 seconds.', '4回目の通常攻撃から会心率30%上昇（6秒）。'),
  starborn: localized('施放共鸣技后，全队攻击力提高 6%，命中敌人防御力降低 5%，持续 20 秒。', 'After Resonance Skill, team ATK increases by 6% and hit enemies lose 5% DEF for 20 seconds.', '共鳴スキル後、全体攻撃力6%上昇し、命中した敵の防御力5%低下（20秒）。'),
  symphoria: localized('持有至少 3 层风调谐印记时，攻击力提高 16%。', 'While holding at least 3 Wind Tuning Marks, ATK increases by 16%.', '風の調律マークを3以上所持中、攻撃力16%上昇。'),
  terara: localized('获得 Burning 时，全队恢复 3 点决断能量并使防御力提高 30%，持续 15 秒。', 'Gaining Burning restores 3 team Decision Charge and increases DEF by 30% for 15 seconds.', 'Burning獲得時、全体の決断チャージ3回復、防御力30%上昇（15秒）。'),
};

// Existing compact records use this helper; detailed records can use beta directly.

// CBT values are reference data, not release facts. The compact summaries below
// deliberately avoid copied skill multipliers and do not support a formal tier list.
export const characters: AzurPromiliaCharacter[] = [
  profile('abby', localized('阿比', 'Abby', 'アビー'), localized('CBT 参考档案；尚未找到对应的官方公开人物页。', 'CBT reference profile; no matching official public profile was found.', 'CBT参考プロフィール。対応する公式公開プロフィールは未確認。'), beta('water', 'rupture', 5, 'unknown', 'Los Lancer', ['assassin', 'break', 'charged-attack'], { gains: ['critical hits', 'skill use'], consumes: ['charged attack'], requires: ['target broken'] }, [
    skill('normal-attack', localized('普通攻击', 'Normal Attack', '通常攻撃'), localized('近战连击，并可衔接重击。', 'A melee combo that can chain into a charged attack.', '近接コンボから重撃へつなげる。')),
    skill('star-resonance', localized('星之共鸣技', 'Star Resonance Skill', '星の共鳴スキル'), localized('进行多段水属性打击，用于制造破绽。', 'Delivers repeated Water hits to create an opening.', '水属性の連続攻撃で隙を作る。'), '12s'),
    skill('star-decision', localized('星之决断技', 'Star Decision Skill', '星の決断スキル'), localized('消耗能量施放范围水属性爆发。', 'Spends energy for an area Water burst.', 'エネルギーを消費して範囲水属性バーストを放つ。'), '20s', '60'),
    skill('star-companion', localized('星之同伴技', 'Star Companion Skill', '星の同伴スキル'), localized('切换入场时追击，并强化下一次输出窗口。', 'On entry, follows up and strengthens the next damage window.', '交代登場時に追撃し、次の火力機会を強化する。')),
  ]), false),
  profile('faridah', localized('法里达', 'Faridah', 'ファリダ'), localized('CBT 参考档案；尚未找到对应的官方公开人物页。', 'CBT reference profile; no matching official public profile was found.', 'CBT参考プロフィール。対応する公式公開プロフィールは未確認。'), betaLegacy('wind', 'rupture', 5, ['attacker', 'break', 'normal-attack'], { gains: ['normal attacks'], consumes: ['skill follow-up'], requires: ['target broken'] }, withBlessing(genericSkill('attacker / break', localized('以普攻衔接破防窗口的风属性输出。', 'A Wind damage dealer that chains normal attacks into break windows.', '通常攻撃からブレイク機会へつなぐ風属性アタッカー。')), localized('触发追击时，攻击力提高 4%，最多叠加 3 层，持续 8 秒。', 'When a follow-up activates, ATK increases by 4% for 8 seconds, up to 3 stacks.', '追撃発動時、攻撃力が4%上昇（8秒、最大3層）。')))),
  profile('luruka', localized('璐璐卡', 'Luruka', 'ルルカ'), localized('CBT 参考档案；尚未找到对应的官方公开人物页。', 'CBT reference profile; no matching official public profile was found.', 'CBT参考プロフィール。対応する公式公開プロフィールは未確認。'), betaLegacy('water', 'imbuement', 5, ['debuff', 'buff', 'healer'], { gains: ['skill use'], consumes: ['support skill'], requires: [] }, withBlessing(genericSkill('debuff / buff / healer', localized('水属性辅助，兼顾减益、增益与治疗。', 'A Water support combining debuffs, buffs, and healing.', 'デバフ、バフ、回復を兼ねる水属性サポート。')), localized('同伴技治疗队友时，恢复 5 点决断能量并使暴击伤害提高 30%，持续 10 秒。', 'Healing an ally with the Companion Skill restores 5 Decision Charge and increases CRIT DMG by 30% for 10 seconds.', '同伴スキルで味方を回復すると決断チャージ5を回復し、会心ダメージ30%上昇（10秒）。')))),
  profile('metsa', localized('梅茨娅', 'Metsa', 'メーツァ'), localized('官方角色介绍：永恒花园的园丁，希望陪伴旅者走到花朵盛放之时。', 'Official character profile: the Evergarden gardener who hopes to walk with you until the flowers bloom.', '公式紹介：エヴァーガーデンのガーデナー。花々が咲き誇る時まで共に歩むことを願う。'), betaLegacy('nature', 'imbuement', 5, ['debuff', 'healer'], { gains: ['skill use'], consumes: ['healing skill'], requires: [] }, withBlessing(genericSkill('debuff / healer', localized('自然属性辅助，提供减益与持续治疗倾向。', 'A Nature support with debuff and sustained-healing utility.', 'デバフと継続回復を担う自然属性サポート。')), localized('拾取特定种子后，全队调谐强度提高 6%，持续 24 秒，最多 4 层。', 'Picking up certain seeds increases team Tuning Strength by 6% for 24 seconds, up to 4 stacks.', '特定の種を拾うと全体の調律強度が6%上昇（24秒、最大4層）。'))), true, 'Rose Lancer'),
  profile('morwyn-halkon', localized('莫温·霍尔康', 'Morwyn Halkon', 'モーウィン・ハルコン'), localized('CBT 参考档案；尚未找到对应的官方公开人物页。', 'CBT reference profile; no matching official public profile was found.', 'CBT参考プロフィール。対応する公式公開プロフィールは未確認。'), betaLegacy('thunder', 'assault', 5, ['attacker', 'overlimit', 'normal-attack'], { gains: ['normal attacks'], consumes: ['overlimit skill'], requires: [] }, genericSkill('attacker / overlimit', localized('以普攻积累并进入超限输出窗口的雷属性攻击手。', 'A Thunder attacker that builds through normal attacks for an Overlimit window.', '通常攻撃で蓄積し、オーバーリミットの火力機会へ入る雷属性アタッカー。')))),
  profile('ruby', localized('露比', 'Ruby', 'ルビー'), localized('CBT 参考档案；尚未找到对应的官方公开人物页。', 'CBT reference profile; no matching official public profile was found.', 'CBT参考プロフィール。対応する公式公開プロフィールは未確認。'), betaLegacy('fire', 'assault', 5, ['attacker', 'overlimit', 'normal-attack'], { gains: ['normal attacks'], consumes: ['overlimit skill'], requires: [] }, genericSkill('attacker / overlimit', localized('火属性攻击手，围绕超限与普攻循环展开。', 'A Fire attacker built around Overlimit and normal-attack cycles.', 'オーバーリミットと通常攻撃の循環を軸にした炎属性アタッカー。')))),
  profile('shalle-ensys', localized('沙勒·恩西斯', 'Shalle Ensys', 'シャーレ・エンシス'), localized('CBT 参考档案；尚未找到对应的官方公开人物页。', 'CBT reference profile; no matching official public profile was found.', 'CBT参考プロフィール。対応する公式公開プロフィールは未確認。'), betaLegacy('water', 'eruption', 5, ['assassin', 'charged-attack'], { gains: ['charged attacks'], consumes: ['eruption skill'], requires: [] }, genericSkill('assassin / charged attack', localized('水属性刺客，围绕重击构建爆发窗口。', 'A Water assassin whose burst window centers on charged attacks.', '重撃を中心にバースト機会を作る水属性アサシン。')))),
  profile('xiaoyu', localized('涂山小玉', 'Xiaoyu', '涂山小玉'), localized('CBT 参考档案；尚未找到对应的官方公开人物页。', 'CBT reference profile; no matching official public profile was found.', 'CBT参考プロフィール。対応する公式公開プロフィールは未確認。'), betaLegacy('wind', 'assault', 5, ['assassin', 'overlimit', 'charged-attack'], { gains: ['charged attacks'], consumes: ['overlimit skill'], requires: [] }, genericSkill('assassin / overlimit', localized('风属性刺客，以重击进入超限爆发。', 'A Wind assassin that uses charged attacks to reach an Overlimit burst.', '重撃からオーバーリミットの爆発力につなげる風属性アサシン。')))),
  profile('anais', localized('阿妮斯', 'Anais', 'アニス'), localized('官方角色介绍：来自卡尔农疗养院的护士，性格温和，愿意照顾旅途中的伙伴。', 'Official character profile: a gentle nurse dispatched from Carnon Sanatorium who offers to care for everyone.', '公式紹介：カルノン療養院から派遣された、みんなのお世話を任せてほしいと語る穏やかな看護師。'), betaLegacy('light', 'imbuement', 4, ['buff', 'healer'], { gains: ['skill use'], consumes: ['healing skill'], requires: [] }, genericSkill('buff / healer', localized('光属性辅助，提供增益与治疗。', 'A Light support focused on buffs and healing.', 'バフと回復を担う光属性サポート。'))), true, 'Fris'),
  profile('cathbelle', localized('卡斯贝尔', 'Cathbelle', 'キャスベル'), localized('官方角色介绍：遵从领主命令前来侍奉，并重视契约。', 'Official character profile: a character who arrives to serve at a lord’s command and values contracts.', '公式紹介：領主の命により仕えるため訪れ、契約を大切にする人物。'), betaLegacy('thunder', 'rupture', 4, ['attacker', 'break', 'charged-attack'], { gains: ['charged attacks'], consumes: ['break skill'], requires: ['target broken'] }, genericSkill('attacker / break', localized('雷属性攻击手，以重击利用破防窗口。', 'A Thunder attacker that uses charged attacks in break windows.', 'ブレイク機会で重撃を使う雷属性アタッカー。'))), true, 'Fris'),
  profile('han-youyou', localized('寒悠悠', 'Han Youyou', '寒悠悠'), localized('CBT 参考档案；尚未找到对应的官方公开人物页。', 'CBT reference profile; no matching official public profile was found.', 'CBT参考プロフィール。対応する公式公開プロフィールは未確認。'), betaLegacy('fire', 'amplifier', 4, ['debuff', 'buff', 'tuning-stacking'], { gains: ['tuning mark stacks'], consumes: ['amplifier skill'], requires: ['tuning marks'] }, genericSkill('debuff / buff / tuning stacking', localized('火属性辅助，通过调谐印记叠层提供减益与增益。', 'A Fire support that uses Tuning Mark stacks for debuffs and buffs.', '調律マークを重ねてデバフとバフを行う炎属性サポート。')))),
  profile('katalua', localized('卡塔露亚', 'Katalua', 'カタルア'), localized('CBT 参考档案；尚未找到对应的官方公开人物页。', 'CBT reference profile; no matching official public profile was found.', 'CBT参考プロフィール。対応する公式公開プロフィールは未確認。'), betaLegacy('earth', 'amplifier', 4, ['tank', 'tuning-stacking'], { gains: ['tuning mark stacks'], consumes: ['defensive skill'], requires: ['tuning marks'] }, genericSkill('tank / tuning stacking', localized('土属性坦克，通过调谐印记强化防御功能。', 'An Earth tank that reinforces defensive utility with Tuning Mark stacks.', '調律マークの蓄積で防御性能を高める土属性タンク。')))),
  profile('lily', localized('莉莉', 'Lily', 'リリー'), localized('CBT 参考档案；尚未找到对应的官方公开人物页。', 'CBT reference profile; no matching official public profile was found.', 'CBT参考プロフィール。対応する公式公開プロフィールは未確認。'), betaLegacy('wind', 'amplifier', 4, ['tank', 'tuning-stacking'], { gains: ['tuning mark stacks'], consumes: ['defensive skill'], requires: ['tuning marks'] }, genericSkill('tank / tuning stacking', localized('风属性坦克，以调谐印记维持防护。', 'A Wind tank that maintains protection through Tuning Mark stacks.', '調律マークの蓄積で防護を維持する風属性タンク。')))),
  profile('mitty', localized('米蒂', 'Mitty', 'ミッティ'), localized('CBT 参考档案；尚未找到对应的官方公开人物页。', 'CBT reference profile; no matching official public profile was found.', 'CBT参考プロフィール。対応する公式公開プロフィールは未確認。'), betaLegacy('thunder', 'amplifier', 4, ['tuning-stacking'], { gains: ['tuning mark stacks'], consumes: ['amplifier skill'], requires: ['tuning marks'] }, genericSkill('tuning stacking', localized('雷属性调谐印记叠层型角色。', 'A Thunder character built around Tuning Mark stacking.', '調律マークの蓄積を軸にする雷属性キャラクター。')))),
  profile('nono', localized('诺诺', 'Nono', 'ノノ'), localized('CBT 参考档案；尚未找到对应的官方公开人物页。', 'CBT reference profile; no matching official public profile was found.', 'CBT参考プロフィール。対応する公式公開プロフィールは未確認。'), betaLegacy('earth', 'rupture', 4, ['attacker', 'break', 'charged-attack'], { gains: ['charged attacks'], consumes: ['break skill'], requires: ['target broken'] }, genericSkill('attacker / break', localized('土属性攻击手，在破防状态下衔接重击。', 'An Earth attacker that follows a break state with charged attacks.', 'ブレイク状態から重撃へつなげる土属性アタッカー。')))),
  profile('pengpeng', localized('蓬蓬', 'Pengpeng', 'ポンポン'), localized('CBT 参考档案；尚未找到对应的官方公开人物页。', 'CBT reference profile; no matching official public profile was found.', 'CBT参考プロフィール。対応する公式公開プロフィールは未確認。'), betaLegacy('fire', 'eruption', 4, ['attacker', 'normal-attack'], { gains: ['normal attacks'], consumes: ['eruption skill'], requires: [] }, genericSkill('attacker', localized('火属性攻击手，主要围绕普攻循环输出。', 'A Fire attacker centered on normal-attack damage cycles.', '通常攻撃の循環を主軸にした炎属性アタッカー。')))),
  profile('starborn', localized('星临者', 'Starborn', 'スター・ボーン'), localized('CBT 参考档案；尚未找到对应的官方公开人物页。', 'CBT reference profile; no matching official public profile was found.', 'CBT参考プロフィール。対応する公式公開プロフィールは未確認。'), betaLegacy('none', 'amplifier', 4, ['buff', 'tuning-stacking'], { gains: ['tuning mark stacks'], consumes: ['amplifier skill'], requires: ['tuning marks'] }, genericSkill('buff / tuning stacking', localized('无属性辅助，通过调谐印记叠层提供增益。', 'A neutral support using Tuning Mark stacks to provide buffs.', '調律マークを重ねてバフを行う無属性サポート。')))),
  profile('symphoria', localized('辛福莉娅', 'Symphoria', 'シンフォーリア'), localized('官方角色介绍：受过充分训练的弓箭手，拥有精准命中各种弓箭目标的实力。', 'Official character profile: a highly trained archer known for never missing with any bow or arrow.', '公式紹介：十分な訓練を受け、どんな弓矢でも外さない腕前を持つアーチャー。'), betaLegacy('wind', 'eruption', 4, ['attacker', 'normal-attack'], { gains: ['normal attacks'], consumes: ['eruption skill'], requires: [] }, genericSkill('attacker', localized('风属性攻击手，侧重普攻输出。', 'A Wind attacker focused on normal-attack output.', '通常攻撃を重視する風属性アタッカー。'))), true, 'Los Lancer'),
  profile('terara', localized('特拉拉', 'Terara', 'テララ'), localized('官方角色介绍：出生于查露露村的顶尖猎人，是保护伙伴的可靠存在。', 'Official character profile: the best hunter from Charlulu Village and a dependable protector of her companions.', '公式紹介：シャルル村生まれの村一番のハンターで、仲間を守る頼もしい存在。'), betaLegacy('fire', 'assault', 4, ['attacker', 'overlimit', 'charged-attack'], { gains: ['charged attacks'], consumes: ['overlimit skill'], requires: [] }, genericSkill('attacker / overlimit', localized('火属性攻击手，通过重击进入超限输出窗口。', 'A Fire attacker that enters an Overlimit damage window through charged attacks.', '重撃でオーバーリミットの火力機会に入る炎属性アタッカー。'))), true, 'Charlulu Village'),
];

for (const character of characters) {
  const blessing = cbtBlessings[character.id];
  if (blessing && !character.beta.skills.some((entry) => entry.category === 'blessing' && entry.description.en === blessing.en)) {
    character.beta.skills = withBlessing(character.beta.skills, blessing);
  }
}
