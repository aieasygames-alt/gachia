'use client';

import { useState, useMemo } from 'react';
import { GAMES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import dynamic from 'next/dynamic';
import { CharacterAvatar } from '@/components/wiki/character-avatar';

// --- Element maps ---

const GenshinCalculator = dynamic(() => import('./genshin-calculator-client').then((mod) => mod.GenshinCalculator), { loading: () => <CalculatorLoading /> });
const WuWaCalculator = dynamic(() => import('./wuwa-calculator-client').then((mod) => mod.WuWaCalculator), { loading: () => <CalculatorLoading /> });
const StarRailCalculator = dynamic(() => import('./starrail-calculator-client').then((mod) => mod.StarRailCalculator), { loading: () => <CalculatorLoading /> });
const ZzzCalculator = dynamic(() => import('./zzz-calculator-client').then((mod) => mod.ZzzCalculator), { loading: () => <CalculatorLoading /> });

function CalculatorLoading() {
  return <div className="rounded-lg border border-game-border bg-game-surface p-8 text-center text-sm text-game-text-muted">Loading calculator...</div>;
}

// --- i18n helper ---

function t(locale: SupportedLocale, zh: string, en: string, ja?: string) {
  return locale === 'zh' ? zh : locale === 'ja' ? (ja ?? en) : en;
}

type Tab = 'ascension' | 'damage' | 'planner';

// =====================================================================
// Client Component
// =====================================================================

export function CalculatorClient({ gameId, locale }: { gameId: GameId; locale: SupportedLocale }) {
  if (gameId === 'sea') return <SeaCalculatorHub locale={locale} />;
  if (gameId === 'skjh') return <SkjhResourceCalculator locale={locale} />;
  if (gameId === 'wuwa') return <WuWaCalculator locale={locale} />;
  if (gameId === 'starrail') return <StarRailCalculator locale={locale} />;
  if (gameId === 'zzz') return <ZzzCalculator locale={locale} />;
  if (gameId !== 'genshin') return <ComingSoon locale={locale} />;
  return <GenshinCalculator locale={locale} />;
}

// =====================================================================
// Sea of Remnants Black Ticket Selector
// =====================================================================

type SeaRoleGap = 'main-dps' | 'survival' | 'follow-up' | 'aoe' | 'stable-dps';
type SeaPlaystyle = 'safe' | 'fast' | 'mechanic' | 'favorite';
type SeaSpendPlan = 'f2p' | 'light' | 'collector';
type SeaTool = 'selector' | 'resources';
type SeaResourceFocus = 'balanced' | 'story' | 'market' | 'outfit';
type SeaRiskLevel = 'safe' | 'normal' | 'greedy';
type SeaResourceBucket = 'story' | 'dredge' | 'market' | 'build' | 'save';

type SeaCandidate = {
  id: string;
  name: Record<SupportedLocale, string>;
  role: Record<SupportedLocale, string>;
  bestFor: Record<SupportedLocale, string>;
  caution: Record<SupportedLocale, string>;
  scores: Record<SeaRoleGap | SeaPlaystyle | SeaSpendPlan, number>;
  tags: Record<SupportedLocale, string[]>;
};

const SEA_BLACK_TICKET_CANDIDATES: SeaCandidate[] = [
  {
    id: 'little-axe',
    name: { zh: '小斧头', en: 'Little Axe', ja: 'Little Axe' },
    role: { zh: '主攻 / 爆发', en: 'Main DPS / Burst', ja: '主攻 / バースト' },
    bestFor: {
      zh: '没有稳定主 C，想让首日推图和 Boss 输出都更直接。',
      en: 'Best if you lack a stable carry and want cleaner day-one story and boss damage.',
      ja: '安定した主力がなく、初日のストーリーとボス火力を伸ばしたい人向け。',
    },
    caution: {
      zh: '如果你已经抽到强主攻，优先级会下降，转而补生存或追击组件。',
      en: 'Drops in priority if you already pulled a strong carry; then fill survival or follow-up gaps.',
      ja: '強い主攻を既に引いた場合は優先度が下がり、生存や追撃を補う方が安全です。',
    },
    scores: { 'main-dps': 9, survival: 2, 'follow-up': 7, aoe: 5, 'stable-dps': 7, safe: 5, fast: 9, mechanic: 6, favorite: 6, f2p: 8, light: 8, collector: 6 },
    tags: {
      zh: ['缺主 C 首选', '追击轴', '首日提速'],
      en: ['Carry first', 'Follow-up core', 'Fast launch'],
      ja: ['主力候補', '追撃軸', '初日加速'],
    },
  },
  {
    id: 'iron-fist-commander',
    name: { zh: '铁腕统领', en: 'Iron Fist Commander', ja: 'Iron Fist Commander' },
    role: { zh: '生存 / 承伤', en: 'Survival / Tank', ja: '生存 / タンク' },
    bestFor: {
      zh: '队伍容易倒、想降低开荒压力，或准备慢慢打海域和高压关。',
      en: 'Best if your team dies often, you want lower launch pressure, or you plan to push harder zones slowly.',
      ja: '倒れやすい編成、安定重視、難しめの海域をゆっくり進めたい人向け。',
    },
    caution: {
      zh: '如果你追求最快清图，先补主攻或追击组件可能更有效。',
      en: 'If you only care about clear speed, a carry or follow-up piece may be more efficient.',
      ja: '最速周回だけを狙うなら、主攻や追撃パーツの方が効率的です。',
    },
    scores: { 'main-dps': 2, survival: 10, 'follow-up': 2, aoe: 3, 'stable-dps': 3, safe: 10, fast: 3, mechanic: 4, favorite: 5, f2p: 8, light: 7, collector: 5 },
    tags: {
      zh: ['稳开荒', '容错率', '前排缺口'],
      en: ['Safe start', 'Forgiveness', 'Frontline gap'],
      ja: ['安定開荒', '許容度', '前衛不足'],
    },
  },
  {
    id: 'stray-cat',
    name: { zh: '饿猫', en: 'Stray Cat', ja: 'Stray Cat' },
    role: { zh: '协攻 / 追击', en: 'Assist / Follow-up', ja: '協攻 / 追撃' },
    bestFor: {
      zh: '已经有小斧头或想提前押追击链，适合喜欢连携输出的玩家。',
      en: 'Best if you already have Little Axe or want to commit early to follow-up chains.',
      ja: 'Little Axeを持っている、または追撃チェーンに寄せたい人向け。',
    },
    caution: {
      zh: '单独拿时不一定解决所有输出问题，最好确认第一队已有主攻。',
      en: 'May not solve damage alone; make sure your first team already has a carry.',
      ja: '単体では火力不足を解決しにくいため、主攻がいるか確認してください。',
    },
    scores: { 'main-dps': 5, survival: 2, 'follow-up': 10, aoe: 4, 'stable-dps': 6, safe: 4, fast: 8, mechanic: 8, favorite: 7, f2p: 7, light: 8, collector: 7 },
    tags: {
      zh: ['追击组件', '连携输出', '已有主 C 更香'],
      en: ['Follow-up piece', 'Synergy damage', 'Better with carry'],
      ja: ['追撃パーツ', '連携火力', '主攻ありで強い'],
    },
  },
  {
    id: 'sea-burial',
    name: { zh: '海葬', en: 'Sea Burial', ja: 'Sea Burial' },
    role: { zh: '智力 / 群体', en: 'Intelligence / AoE', ja: '知力 / 範囲' },
    bestFor: {
      zh: '想走智力队、群体清场或机制战路线，适合不想只押单体爆发的玩家。',
      en: 'Best for Intelligence teams, AoE clears, and mechanic-heavy fights.',
      ja: '知力編成、範囲処理、ギミック戦を重視する人向け。',
    },
    caution: {
      zh: '首日如果主要卡在单体 Boss，可能没有小斧头那么直接。',
      en: 'If day-one blockers are mostly single-target bosses, Little Axe may feel more direct.',
      ja: '初日に単体ボスで詰まるならLittle Axeの方が直接的です。',
    },
    scores: { 'main-dps': 6, survival: 2, 'follow-up': 3, aoe: 10, 'stable-dps': 6, safe: 5, fast: 7, mechanic: 9, favorite: 6, f2p: 7, light: 7, collector: 7 },
    tags: {
      zh: ['智力队', '群体清场', '机制战'],
      en: ['INT team', 'AoE clear', 'Mechanics'],
      ja: ['知力編成', '範囲処理', 'ギミック'],
    },
  },
  {
    id: 'isabella',
    name: { zh: '伊莎贝拉', en: 'Isabella', ja: 'Isabella' },
    role: { zh: '智力 / 机制', en: 'Intelligence / Utility', ja: '知力 / ギミック' },
    bestFor: {
      zh: '想围绕机制战、智力队补位或长期构筑，而不是只看首日输出。',
      en: 'Best if you value mechanic coverage, Intelligence teams, and long-term roster shape.',
      ja: 'ギミック対応、知力編成、長期的な手持ち作りを重視する人向け。',
    },
    caution: {
      zh: '如果账号缺最基础的输出和生存，她不是最省心的一号选择。',
      en: 'Not the easiest first pick if you lack both basic damage and survival.',
      ja: '基本火力と生存が両方不足している場合、最初の選択としてはやや難しめです。',
    },
    scores: { 'main-dps': 4, survival: 3, 'follow-up': 3, aoe: 8, 'stable-dps': 5, safe: 5, fast: 5, mechanic: 10, favorite: 7, f2p: 6, light: 7, collector: 8 },
    tags: {
      zh: ['机制位', '智力队', '长期构筑'],
      en: ['Utility', 'INT team', 'Long-term'],
      ja: ['ギミック', '知力編成', '長期育成'],
    },
  },
  {
    id: 'scorched-colonel',
    name: { zh: '焦面上校', en: 'Scorched Colonel', ja: 'Scorched Colonel' },
    role: { zh: '主攻 / 稳定输出', en: 'Main DPS / Stable Damage', ja: '主攻 / 安定火力' },
    bestFor: {
      zh: '想要不太绑定体系的稳定输出位，或不喜欢追击链的操作/构筑成本。',
      en: 'Best if you want stable damage without committing hard to follow-up chains.',
      ja: '追撃チェーンに強く寄せず、安定火力が欲しい人向け。',
    },
    caution: {
      zh: '上限可能要等实测确认；如果你追求爆发和热门路线，小斧头更激进。',
      en: 'Ceiling needs live testing; Little Axe is the more aggressive pick for burst routes.',
      ja: '上限は実測待ち。バースト重視ならLittle Axeの方が攻めた選択です。',
    },
    scores: { 'main-dps': 8, survival: 2, 'follow-up': 4, aoe: 4, 'stable-dps': 10, safe: 7, fast: 6, mechanic: 4, favorite: 6, f2p: 7, light: 7, collector: 5 },
    tags: {
      zh: ['稳定输出', '不强绑体系', '备选主攻'],
      en: ['Stable DPS', 'Low commitment', 'Carry option'],
      ja: ['安定火力', '低依存', '主攻候補'],
    },
  },
];

function SeaCalculatorHub({ locale }: { locale: SupportedLocale }) {
  const [tool, setTool] = useState<SeaTool>('selector');

  const tabs: Array<{ id: SeaTool; label: string; desc: string }> = [
    {
      id: 'selector',
      label: t(locale, '黑券 6 选 1', 'Black Ticket selector', '黒券6択'),
      desc: t(locale, '按队伍缺口排序首个黑券船员', 'Rank your first Black Ticket crew', '初回黒券船員を順位付け'),
    },
    {
      id: 'resources',
      label: t(locale, '首周资源分配器', 'Week-one resource planner', '初週リソース配分'),
      desc: t(locale, '把体力、打捞、交易和外观预算拆成行动清单', 'Split stamina, dredging, trading, and cosmetics into an action plan', 'スタミナ、サルベージ、交易、衣装予算を配分'),
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-game-border bg-game-surface p-5">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-game-primary">
          {t(locale, '首周资源决策', 'Week-one resource decision', '初週リソース判断')}
        </p>
        <h1 className="text-2xl font-bold text-game-text">
          {t(locale, '遗忘之海决策工具台', 'Sea of Remnants Decision Tools', 'Sea of Remnants 判断ツール')}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-game-text-muted">
          {t(
            locale,
            '先用黑券推荐器确定第一队核心，再用资源分配器把首周体力、周常打捞、好金砖和外观预算拆成可执行路线。结果用于开服规划，正式数值以游戏内为准。',
            'Choose your first-team core with the Black Ticket selector, then turn stamina, weekly dredging, Good Gold Bricks, and outfit spending into an executable week-one route. Use this for planning; live values follow the game.',
            '黒券おすすめで第一編成の核を決め、初週のスタミナ、週課サルベージ、好金砖、衣装予算を実行ルートに落とします。正式値はゲーム内を基準にしてください。'
          )}
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTool(tab.id)}
              className={`rounded-2xl border p-4 text-left transition ${
                tool === tab.id
                  ? 'border-game-primary bg-game-primary/10'
                  : 'border-game-border bg-game-surface-alt hover:border-game-primary/60'
              }`}
            >
              <div className="text-base font-bold text-game-text">{tab.label}</div>
              <div className="mt-1 text-xs leading-5 text-game-text-muted">{tab.desc}</div>
            </button>
          ))}
        </div>
      </section>

      {tool === 'selector' ? <SeaBlackTicketSelector locale={locale} /> : <SeaWeekOneResourcePlanner locale={locale} />}
    </div>
  );
}

function SeaBlackTicketSelector({ locale }: { locale: SupportedLocale }) {
  const [roleGap, setRoleGap] = useState<SeaRoleGap>('main-dps');
  const [playstyle, setPlaystyle] = useState<SeaPlaystyle>('safe');
  const [spendPlan, setSpendPlan] = useState<SeaSpendPlan>('f2p');

  const ranked = useMemo(() => {
    return SEA_BLACK_TICKET_CANDIDATES.map((candidate) => {
      const score = candidate.scores[roleGap] * 1.4 + candidate.scores[playstyle] + candidate.scores[spendPlan] * 0.8;
      return { candidate, score: Math.round(score * 10) / 10 };
    }).sort((a, b) => b.score - a.score);
  }, [roleGap, playstyle, spendPlan]);

  const roleOptions: Array<{ id: SeaRoleGap; label: Record<SupportedLocale, string>; hint: Record<SupportedLocale, string> }> = [
    { id: 'main-dps', label: { zh: '缺主攻', en: 'Need carry', ja: '主攻不足' }, hint: { zh: '推主线和打 Boss 都缺核心输出。', en: 'You need damage for story and bosses.', ja: 'ストーリーとボス用の火力が不足。' } },
    { id: 'survival', label: { zh: '缺生存', en: 'Need survival', ja: '生存不足' }, hint: { zh: '队伍容易倒，想稳住首周。', en: 'Your team dies too often.', ja: '編成が倒れやすい。' } },
    { id: 'follow-up', label: { zh: '想玩追击', en: 'Follow-up chain', ja: '追撃軸' }, hint: { zh: '围绕追加攻击和连携输出建队。', en: 'Build around extra attacks and synergy.', ja: '追加攻撃と連携を重視。' } },
    { id: 'aoe', label: { zh: '缺群攻', en: 'Need AoE', ja: '範囲不足' }, hint: { zh: '想提升清怪和机制战覆盖。', en: 'Improve mob clears and mechanic fights.', ja: '雑魚処理とギミック対応を強化。' } },
    { id: 'stable-dps', label: { zh: '要稳定输出', en: 'Stable DPS', ja: '安定火力' }, hint: { zh: '不想绑定复杂体系，先要通用输出。', en: 'You want low-commitment damage.', ja: '複雑な軸に縛られない火力。' } },
  ];

  const playstyleOptions: Array<{ id: SeaPlaystyle; label: Record<SupportedLocale, string>; hint: Record<SupportedLocale, string> }> = [
    { id: 'safe', label: { zh: '稳开荒', en: 'Safe start', ja: '安定開荒' }, hint: { zh: '降低翻车和资源浪费。', en: 'Reduce wipes and wasted resources.', ja: '事故と資源浪費を減らす。' } },
    { id: 'fast', label: { zh: '冲进度', en: 'Push fast', ja: '高速進行' }, hint: { zh: '优先推图、清怪和 Boss 速度。', en: 'Prioritize story and boss speed.', ja: '進行速度とボス処理を優先。' } },
    { id: 'mechanic', label: { zh: '机制党', en: 'Mechanics', ja: 'ギミック重視' }, hint: { zh: '想提前覆盖复杂战斗。', en: 'Prepare for tricky encounters.', ja: '複雑な戦闘に備える。' } },
    { id: 'favorite', label: { zh: '厨力优先', en: 'Favorite first', ja: '推し優先' }, hint: { zh: '强度之外，也看长期喜欢。', en: 'Balance power with long-term attachment.', ja: '性能と好みを両立。' } },
  ];

  const spendOptions: Array<{ id: SeaSpendPlan; label: Record<SupportedLocale, string>; hint: Record<SupportedLocale, string> }> = [
    { id: 'f2p', label: { zh: '零氪', en: 'F2P', ja: '無課金' }, hint: { zh: '每次选择都要补最关键缺口。', en: 'Every pick must cover a core gap.', ja: '重要な不足を優先。' } },
    { id: 'light', label: { zh: '轻氪', en: 'Light spender', ja: '微課金' }, hint: { zh: '可先凑第一队，再看限定。', en: 'Build first team, then chase limited picks.', ja: '第一編成後に限定を検討。' } },
    { id: 'collector', label: { zh: '收藏', en: 'Collector', ja: 'コレクター' }, hint: { zh: '接受短期效率稍低，换长期喜好。', en: 'Accept lower short-term efficiency for favorites.', ja: '短期効率より好みを重視。' } },
  ];

  const top = ranked[0]!;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-game-border bg-game-surface p-5">
        <h2 className="text-2xl font-bold text-game-text">
          {t(locale, '遗忘之海黑券 6 选 1 推荐器', 'Sea of Remnants Black Ticket Selector', 'Sea of Remnants 黒券6択おすすめ')}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-game-text-muted">
          {t(
            locale,
            '根据你当前最缺的位置、开荒风格和付费计划，给首次记忆重逢 6 选 1 一个可执行排序。结果用于开服规划，正式数值和卡池规则仍以游戏内为准。',
            'Pick your first Black Ticket crew member based on roster gaps, launch style, and spending plan. Use it for planning; live stats and pool rules still follow the game.',
            '不足ロール、序盤スタイル、課金予定から初回黒券6択の優先度を出します。正式な数値とプール規則はゲーム内表記を基準にしてください。'
          )}
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <SelectorGroup title={t(locale, '你现在最缺什么？', 'What is your biggest gap?', '今一番足りないもの')} options={roleOptions} selected={roleGap} onSelect={setRoleGap} locale={locale} />
        <SelectorGroup title={t(locale, '你想怎么开荒？', 'How do you want to start?', 'どう進めたい？')} options={playstyleOptions} selected={playstyle} onSelect={setPlaystyle} locale={locale} />
        <SelectorGroup title={t(locale, '资源计划', 'Resource plan', 'リソース方針')} options={spendOptions} selected={spendPlan} onSelect={setSpendPlan} locale={locale} />
      </section>

      <section className="rounded-2xl border border-game-primary/40 bg-game-primary/10 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-game-primary">
              {t(locale, '当前推荐', 'Current recommendation', '現在のおすすめ')}
            </p>
            <h2 className="mt-1 text-3xl font-black text-game-text">{top.candidate.name[locale]}</h2>
            <p className="mt-2 text-sm text-game-text-muted">{top.candidate.role[locale]}</p>
          </div>
          <div className="rounded-2xl border border-game-border bg-game-surface px-5 py-4 text-center">
            <div className="text-xs text-game-text-muted">{t(locale, '匹配分', 'Match score', '適性スコア')}</div>
            <div className="mt-1 text-3xl font-black text-game-primary">{top.score}</div>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-game-text-muted">{top.candidate.bestFor[locale]}</p>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold text-game-text">
          {t(locale, '完整排序', 'Full ranking', '全順位')}
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {ranked.map(({ candidate, score }, index) => (
            <article key={candidate.id} className="rounded-2xl border border-game-border bg-game-surface p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-game-primary">#{index + 1}</div>
                  <h3 className="mt-1 text-lg font-bold text-game-text">{candidate.name[locale]}</h3>
                  <p className="mt-1 text-sm text-game-text-muted">{candidate.role[locale]}</p>
                </div>
                <span className="rounded-full bg-game-surface-alt px-3 py-1 text-sm font-bold text-game-primary">{score}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-game-text-muted">{candidate.bestFor[locale]}</p>
              <p className="mt-2 text-xs leading-5 text-game-text-muted">{candidate.caution[locale]}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {candidate.tags[locale].map((tag) => (
                  <span key={tag} className="rounded-full border border-game-border bg-game-surface-alt px-2 py-1 text-xs text-game-text-muted">
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <a href={`/${locale}/sea/guides/gacha-recruitment-guide`} className="rounded-2xl border border-game-border bg-game-surface p-4 transition hover:border-game-primary">
          <h3 className="font-bold text-game-text">{t(locale, '招募系统指南', 'Recruitment guide', '募集ガイド')}</h3>
          <p className="mt-2 text-sm text-game-text-muted">{t(locale, '看 6 选 1、40 抽保底和零氪路线。', 'Check selector, 40-pull guarantee, and F2P route.', '6択、40連保証、無課金ルートを確認。')}</p>
        </a>
        <a href={`/${locale}/sea/tier-list`} className="rounded-2xl border border-game-border bg-game-surface p-4 transition hover:border-game-primary">
          <h3 className="font-bold text-game-text">{t(locale, '船员节奏榜', 'Crew tier list', '船員Tier')}</h3>
          <p className="mt-2 text-sm text-game-text-muted">{t(locale, '对照首周队伍和角色定位。', 'Compare week-one teams and roles.', '初週編成と役割を確認。')}</p>
        </a>
        <a href={`/${locale}/sea/guides/launch-30min-checklist`} className="rounded-2xl border border-game-border bg-game-surface p-4 transition hover:border-game-primary">
          <h3 className="font-bold text-game-text">{t(locale, '开服 30 分钟', 'First 30 minutes', '最初の30分')}</h3>
          <p className="mt-2 text-sm text-game-text-muted">{t(locale, '选完黑券后继续走首日清单。', 'After choosing, continue into the day-one checklist.', '選択後は初日チェックリストへ。')}</p>
        </a>
      </section>
    </div>
  );
}

function SeaWeekOneResourcePlanner({ locale }: { locale: SupportedLocale }) {
  const [hours, setHours] = useState(2);
  const [focus, setFocus] = useState<SeaResourceFocus>('balanced');
  const [risk, setRisk] = useState<SeaRiskLevel>('safe');
  const [hasCarry, setHasCarry] = useState(false);
  const [hasSurvival, setHasSurvival] = useState(false);

  const allocation = useMemo(() => {
    const base = {
      story: focus === 'story' ? 36 : focus === 'market' ? 24 : focus === 'outfit' ? 22 : 30,
      dredge: focus === 'story' ? 22 : focus === 'market' ? 24 : focus === 'outfit' ? 20 : 24,
      market: focus === 'market' ? 30 : focus === 'outfit' ? 24 : 18,
      build: focus === 'story' ? 16 : focus === 'market' ? 12 : focus === 'outfit' ? 14 : 16,
      save: focus === 'outfit' ? 20 : focus === 'market' ? 10 : 12,
    };
    if (!hasCarry) {
      base.story += 4;
      base.save += 2;
      base.market -= 3;
      base.build -= 3;
    }
    if (!hasSurvival) {
      base.dredge += 3;
      base.build += 2;
      base.market -= 3;
      base.save -= 2;
    }
    if (risk === 'safe') {
      base.save += 6;
      base.market -= 3;
      base.build -= 3;
    } else if (risk === 'greedy') {
      base.market += 7;
      base.save -= 5;
      base.dredge -= 2;
    }

    const entries = (Object.entries(base) as Array<[SeaResourceBucket, number]>).map(([key, value]) => [key, Math.max(5, value)] as const);
    const total = entries.reduce((sum, [, value]) => sum + value, 0);
    return Object.fromEntries(entries.map(([key, value]) => [key, Math.round((value / total) * 100)])) as Record<SeaResourceBucket, number>;
  }, [focus, hasCarry, hasSurvival, risk]);

  const weeklyHours = Math.max(1, hours) * 7;
  const taskHours = {
    story: Math.round((weeklyHours * allocation.story) / 100),
    dredge: Math.round((weeklyHours * allocation.dredge) / 100),
    market: Math.round((weeklyHours * allocation.market) / 100),
    build: Math.round((weeklyHours * allocation.build) / 100),
    save: Math.max(1, Math.round((weeklyHours * allocation.save) / 100)),
  };

  const focusOptions: Array<{ id: SeaResourceFocus; label: string; hint: string }> = [
    { id: 'balanced', label: t(locale, '均衡开荒', 'Balanced launch', 'バランス'), hint: t(locale, '主线、周常、交易都不漏。', 'Do not miss story, weekly, or market value.', 'メイン、週課、交易を落とさない。') },
    { id: 'story', label: t(locale, '先推主线', 'Push story', 'メイン優先'), hint: t(locale, '尽快解锁海域、日常和系统。', 'Unlock zones, dailies, and systems faster.', '海域、日課、機能を早めに解放。') },
    { id: 'market', label: t(locale, '交易优先', 'Market first', '交易優先'), hint: t(locale, '把好金砖和可交易资源放前面。', 'Front-load Good Gold Bricks and tradable resources.', '好金砖と交易品を前倒し。') },
    { id: 'outfit', label: t(locale, '外观留预算', 'Save for outfits', '衣装予算'), hint: t(locale, '降低乱抽，给服装/船皮留空间。', 'Reduce impulse pulls and reserve cosmetic budget.', '衝動引きを抑え衣装予算を残す。') },
  ];

  const riskOptions: Array<{ id: SeaRiskLevel; label: string; hint: string }> = [
    { id: 'safe', label: t(locale, '保守', 'Safe', '安全'), hint: t(locale, '少追涨，多留资源等实测。', 'Avoid chasing spikes; wait for live data.', '高騰追いを避け実測待ち。') },
    { id: 'normal', label: t(locale, '正常', 'Normal', '通常'), hint: t(locale, '按每日收益稳定推进。', 'Progress with steady daily returns.', '日次収益で安定進行。') },
    { id: 'greedy', label: t(locale, '抢首周交易', 'Greedy market', '初週交易狙い'), hint: t(locale, '多观察价格，但波动风险更高。', 'Watch prices harder, with higher volatility risk.', '価格を見る時間を増やすがリスク高め。') },
  ];

  const rows = [
    { key: 'story', label: t(locale, '主线 / 系统解锁', 'Story / unlocks', 'メイン / 解放'), pct: allocation.story, hours: taskHours.story, note: t(locale, '优先解锁奥托皮亚、日常、招募和贸易入口。', 'Unlock Orbtopia, dailies, recruitment, and market access first.', 'Orbtopia、日課、募集、交易入口を優先。') },
    { key: 'dredge', label: t(locale, '周常打捞 / 黑券机会', 'Weekly dredging / Black Ticket chances', '週課サルベージ / 黒券機会'), pct: allocation.dredge, hours: taskHours.dredge, note: t(locale, '每周免费/高价值打捞先清，不要等周末才想起。', 'Clear free and high-value dredging early, not at the weekend.', '無料・高価値サルベージは週末前に処理。') },
    { key: 'market', label: t(locale, '贸易场 / 好金砖', 'Market / Good Gold Bricks', '交易所 / 好金砖'), pct: allocation.market, hours: taskHours.market, note: t(locale, '记录常用材料价格，低波动资源可换启动资金。', 'Track common material prices; low-volatility resources can fund launch needs.', '一般素材価格を記録し、安定品で初動資金化。') },
    { key: 'build', label: t(locale, '第一队养成', 'First-team build', '第一編成育成'), pct: allocation.build, hours: taskHours.build, note: t(locale, '只养主攻、关键辅助、生存位，不要平均拉满。', 'Invest in carry, key support, and survival only; avoid spreading thin.', '主攻、重要支援、生存だけ育て平均育成を避ける。') },
    { key: 'save', label: t(locale, '预留 / 外观预算', 'Reserve / outfits', '予備 / 衣装予算'), pct: allocation.save, hours: taskHours.save, note: t(locale, '留给后续活动、服装池、价格回落和补洞。', 'Reserve for events, outfit pools, price dips, and roster fixes.', 'イベント、衣装、価格下落、穴埋め用に残す。') },
  ];

  const numberInput = (
    <label className="block rounded-2xl border border-game-border bg-game-surface p-4">
      <span className="mb-2 block text-sm font-bold text-game-text">{t(locale, '每天可玩小时', 'Hours per day', '1日プレイ時間')}</span>
      <input
        type="number"
        min={1}
        max={12}
        value={hours}
        onChange={(event) => setHours(Math.min(12, Math.max(1, Number(event.target.value) || 1)))}
        className="w-full rounded-lg border border-game-border bg-game-surface-alt px-3 py-2 text-sm text-game-text outline-none transition focus:border-game-primary"
      />
      <p className="mt-2 text-xs text-game-text-muted">
        {t(locale, `按每周约 ${weeklyHours} 小时估算。`, `Estimated from about ${weeklyHours} hours per week.`, `週約${weeklyHours}時間で見積もり。`)}
      </p>
    </label>
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-game-border bg-game-surface p-5">
        <h2 className="text-2xl font-bold text-game-text">
          {t(locale, '首周资源分配器', 'Week-one Resource Planner', '初週リソース配分')}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-game-text-muted">
          {t(
            locale,
            '把“今天到底先干嘛”拆成比例：先解锁系统，再守住周常打捞，最后决定好金砖、抽卡和服装预算。适合零氪、轻氪和想少踩坑的首周玩家。',
            'Split “what should I do today” into ratios: unlock systems, protect weekly dredging, then decide Good Gold Bricks, pulls, and outfit budget. Useful for F2P, light spenders, and cautious week-one players.',
            '今日何をするかを比率化します。機能解放、週課サルベージ、好金砖、ガチャ、衣装予算の順で整理できます。'
          )}
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {numberInput}
        <PlannerGroup title={t(locale, '本周目标', 'This week focus', '今週の目標')} options={focusOptions} selected={focus} onSelect={setFocus} />
        <PlannerGroup title={t(locale, '风险偏好', 'Risk level', 'リスク')} options={riskOptions} selected={risk} onSelect={setRisk} />
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <ToggleCard
          checked={hasCarry}
          onChange={setHasCarry}
          title={t(locale, '已有稳定主攻', 'Already have a carry', '主攻あり')}
          body={t(locale, '勾选后会减少主线/抽卡压力，把更多时间给交易或预留。', 'Reduces story/pull pressure and frees time for market or reserves.', 'メイン/ガチャ圧を下げ、交易や予備へ回します。')}
        />
        <ToggleCard
          checked={hasSurvival}
          onChange={setHasSurvival}
          title={t(locale, '已有可靠生存位', 'Already have survival', '生存あり')}
          body={t(locale, '勾选后会减少容错补强，把更多资源给推进和好金砖。', 'Reduces survival patching and shifts more resources to progress and bricks.', '生存補強を減らし進行と好金砖へ回します。')}
        />
      </section>

      <section className="rounded-2xl border border-game-primary/40 bg-game-primary/10 p-5">
        <h3 className="text-lg font-bold text-game-text">{t(locale, '推荐分配', 'Recommended split', 'おすすめ配分')}</h3>
        <div className="mt-4 space-y-4">
          {rows.map((row) => (
            <div key={row.key}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-game-text">{row.label}</div>
                  <div className="text-xs text-game-text-muted">{row.note}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-lg font-black text-game-primary">{row.pct}%</div>
                  <div className="text-xs text-game-text-muted">{t(locale, `约 ${row.hours} 小时`, `~${row.hours}h`, `約${row.hours}h`)}</div>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-game-surface">
                <div className="h-full rounded-full bg-game-primary" style={{ width: `${row.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <a href={`/${locale}/sea/guides/mechanics-faq-guide`} className="rounded-2xl border border-game-border bg-game-surface p-4 transition hover:border-game-primary">
          <h3 className="font-bold text-game-text">{t(locale, '机制 FAQ', 'Mechanics FAQ', 'システムFAQ')}</h3>
          <p className="mt-2 text-sm text-game-text-muted">{t(locale, '确认减伤、周常和资源冲突。', 'Confirm mitigation, weeklies, and resource conflicts.', '軽減、週課、資源衝突を確認。')}</p>
        </a>
        <a href={`/${locale}/sea/guides/good-gold-bricks-farming-guide`} className="rounded-2xl border border-game-border bg-game-surface p-4 transition hover:border-game-primary">
          <h3 className="font-bold text-game-text">{t(locale, '好金砖速刷', 'Good Gold Bricks', '好金砖')}</h3>
          <p className="mt-2 text-sm text-game-text-muted">{t(locale, '把交易比例落到赚钱路线。', 'Turn the market split into an earning route.', '交易配分を金策へ落とす。')}</p>
        </a>
        <a href={`/${locale}/sea/guides/character-vs-outfit-pull-guide`} className="rounded-2xl border border-game-border bg-game-surface p-4 transition hover:border-game-primary">
          <h3 className="font-bold text-game-text">{t(locale, '角色还是服装', 'Crew or outfits', '船員か衣装か')}</h3>
          <p className="mt-2 text-sm text-game-text-muted">{t(locale, '把预留预算变成抽取规则。', 'Turn reserves into pull rules.', '予備を抽選ルールへ。')}</p>
        </a>
      </section>
    </div>
  );
}

function PlannerGroup<T extends string>({
  title,
  options,
  selected,
  onSelect,
}: {
  title: string;
  options: Array<{ id: T; label: string; hint: string }>;
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <section className="rounded-2xl border border-game-border bg-game-surface p-4">
      <h3 className="mb-3 text-sm font-bold text-game-text">{title}</h3>
      <div className="space-y-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            className={`w-full rounded-xl border p-3 text-left transition ${
              selected === option.id
                ? 'border-game-primary bg-game-primary/10 text-game-text'
                : 'border-game-border bg-game-surface-alt text-game-text-muted hover:border-game-primary/60'
            }`}
          >
            <div className="text-sm font-bold">{option.label}</div>
            <div className="mt-1 text-xs leading-5 opacity-80">{option.hint}</div>
          </button>
        ))}
      </div>
    </section>
  );
}

function ToggleCard({
  checked,
  onChange,
  title,
  body,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`rounded-2xl border p-4 text-left transition ${
        checked ? 'border-game-primary bg-game-primary/10' : 'border-game-border bg-game-surface hover:border-game-primary/60'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-game-text">{title}</h3>
        <span className={`h-5 w-9 rounded-full border p-0.5 ${checked ? 'border-game-primary bg-game-primary/30' : 'border-game-border bg-game-surface-alt'}`}>
          <span className={`block h-3.5 w-3.5 rounded-full bg-game-primary transition ${checked ? 'translate-x-4' : ''}`} />
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-game-text-muted">{body}</p>
    </button>
  );
}

function SelectorGroup<T extends string>({
  title,
  options,
  selected,
  onSelect,
  locale,
}: {
  title: string;
  options: Array<{ id: T; label: Record<SupportedLocale, string>; hint: Record<SupportedLocale, string> }>;
  selected: T;
  onSelect: (value: T) => void;
  locale: SupportedLocale;
}) {
  return (
    <section className="rounded-2xl border border-game-border bg-game-surface p-4">
      <h2 className="mb-3 text-base font-bold text-game-text">{title}</h2>
      <div className="space-y-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            className={`w-full rounded-xl border p-3 text-left transition ${
              selected === option.id
                ? 'border-game-primary bg-game-primary/10 text-game-text'
                : 'border-game-border bg-game-surface-alt text-game-text-muted hover:border-game-primary/60'
            }`}
          >
            <div className="text-sm font-bold">{option.label[locale]}</div>
            <div className="mt-1 text-xs leading-5 opacity-80">{option.hint[locale]}</div>
          </button>
        ))}
      </div>
    </section>
  );
}

// =====================================================================
// Ashfall Evolution Resource Calculator
// =====================================================================

function SkjhResourceCalculator({ locale }: { locale: SupportedLocale }) {
  const [stoneWalls, setStoneWalls] = useState(12);
  const [metalDoors, setMetalDoors] = useState(3);
  const [stoneFoundations, setStoneFoundations] = useState(6);
  const [hours, setHours] = useState(24);
  const [raidStoneWalls, setRaidStoneWalls] = useState(2);
  const [raidMetalDoors, setRaidMetalDoors] = useState(1);
  const [ore, setOre] = useState(1000);
  const [furnaces, setFurnaces] = useState(2);

  const upkeep = useMemo(() => {
    const stone = Math.ceil((stoneWalls * 30 + stoneFoundations * 45) * (hours / 24));
    const metal = Math.ceil(metalDoors * 35 * (hours / 24));
    const wood = Math.ceil((stoneWalls + stoneFoundations + metalDoors) * 8 * (hours / 24));
    return { stone, metal, wood };
  }, [stoneWalls, metalDoors, stoneFoundations, hours]);

  const buildCost = useMemo(() => ({
    stone: stoneWalls * 300 + stoneFoundations * 450,
    metal: metalDoors * 200,
    wood: metalDoors * 80,
  }), [stoneWalls, stoneFoundations, metalDoors]);

  const raidCost = useMemo(() => {
    const explosiveAmmo = raidStoneWalls * 160 + raidMetalDoors * 80;
    const rockets = Math.ceil(raidStoneWalls * 2 + raidMetalDoors * 1.5);
    const sulfur = explosiveAmmo * 25 + rockets * 1400;
    return { explosiveAmmo, rockets, sulfur };
  }, [raidStoneWalls, raidMetalDoors]);

  const smelt = useMemo(() => {
    const throughput = Math.max(1, furnaces) * 600;
    const hoursNeeded = ore / throughput;
    return {
      metalFragments: Math.floor(ore * 0.65),
      charcoal: Math.floor(ore * 0.2),
      hoursNeeded,
    };
  }, [ore, furnaces]);

  const numberInput = (label: string, value: number, onChange: (value: number) => void, min = 0) => (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-game-text-muted">{label}</span>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
        className="w-full rounded-lg border border-game-border bg-game-surface-alt px-3 py-2 text-sm text-game-text outline-none transition-colors focus:border-game-primary"
      />
    </label>
  );

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold" style={{ color: GAMES.skjh.theme.primary }}>
        {t(locale, '失控进化资源计算器', 'Ashfall Evolution Resource Calculator', '失控進化 資源計算機')}
      </h1>
      <p className="mb-6 text-sm text-game-text-muted">
        {t(locale, '估算领地柜维护、石墙地基、金属门、抄家爆破、硫磺预算和自动化烧矿收益。适合开荒建家、换服判断、周末抄家前做资源规划；数值用于路线估算，后续可随实测数据微调。', 'Estimate territory upkeep, stone foundations, metal doors, raid costs, sulfur budget, and automated smelting returns for base planning, server decisions, and raid prep.', '領地維持、石壁、金属扉、レイド、硫黄、自動精錬を見積もり、拠点計画と鯖判断に使えます。')}
      </p>

      <section className="mb-6 rounded-2xl border border-game-border bg-game-surface p-4">
        <h2 className="mb-2 text-base font-semibold text-game-text">
          {t(locale, '先算资源，再决定开荒路线', 'Calculate resources before choosing your route', '資源を計算してからルートを決める')}
        </h2>
        <p className="text-sm leading-6 text-game-text-muted">
          {t(
            locale,
            '如果你搜索的是“失控进化计算器、领地柜维护、抄家成本、烧矿收益”，先用下面四个模块估算资源压力，再回到服务器模式、0-2 小时开荒和自定义模式页面继续决策。',
            'If you searched for upkeep, raid cost, or smelting calculators, estimate pressure below, then continue into server mode, first 0-2 hours, and custom-mode pages.',
            '維持費、レイドコスト、精錬計算を探している場合、下で資源圧を見積もり、サーバー、0-2時間ルート、カスタムモードへ進みます。'
          )}
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <a href={`/${locale}/skjh/guides/server-mode-choice`} className="rounded-xl border border-game-border bg-game-surface-alt p-3 transition hover:border-game-primary">
            <span className="block text-sm font-semibold text-game-text">{t(locale, '服务器模式', 'Server modes', 'サーバーモード')}</span>
            <span className="mt-1 block text-xs leading-5 text-game-text-muted">{t(locale, '先确认安全区、标准和挑战服压力。', 'Check safe-zone, standard, and challenge pressure.', '安全区、標準、挑戦の圧を確認。')}</span>
          </a>
          <a href={`/${locale}/skjh/guides/first-2-hours-starter-route`} className="rounded-xl border border-game-border bg-game-surface-alt p-3 transition hover:border-game-primary">
            <span className="block text-sm font-semibold text-game-text">{t(locale, '0-2 小时开荒', 'First 0-2 hours', '0-2時間ルート')}</span>
            <span className="mt-1 block text-xs leading-5 text-game-text-muted">{t(locale, '把工具、领地柜和第一轮资源接上。', 'Connect tools, territory cabinet, and first resources.', '道具、領地柜、初動資源を接続。')}</span>
          </a>
          <a href={`/${locale}/skjh/guides/custom-mode-community-server-guide`} className="rounded-xl border border-game-border bg-game-surface-alt p-3 transition hover:border-game-primary">
            <span className="block text-sm font-semibold text-game-text">{t(locale, '自定义模式', 'Custom mode', 'カスタムモード')}</span>
            <span className="mt-1 block text-xs leading-5 text-game-text-muted">{t(locale, '关注社区服、教学服和活动服机会。', 'Track community, training, and event-server opportunities.', 'コミュニティ、練習、イベント鯖を確認。')}</span>
          </a>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-game-border bg-game-surface p-4">
          <h2 className="mb-3 text-lg font-semibold text-game-text">{t(locale, '领地柜维护估算', 'Territory Upkeep', '領地維持')}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {numberInput(t(locale, '石墙数量', 'Stone Walls', '石壁数'), stoneWalls, setStoneWalls)}
            {numberInput(t(locale, '石地基数量', 'Stone Foundations', '石土台数'), stoneFoundations, setStoneFoundations)}
            {numberInput(t(locale, '金属门数量', 'Metal Doors', '金属扉数'), metalDoors, setMetalDoors)}
            {numberInput(t(locale, '维护小时数', 'Upkeep Hours', '維持時間'), hours, setHours, 1)}
          </div>
          <ResultGrid
            items={[
              [t(locale, '石头', 'Stone', '石'), upkeep.stone],
              [t(locale, '金属碎片', 'Metal Fragments', '金属片'), upkeep.metal],
              [t(locale, '木材', 'Wood', '木材'), upkeep.wood],
            ]}
          />
        </section>

        <section className="rounded-lg border border-game-border bg-game-surface p-4">
          <h2 className="mb-3 text-lg font-semibold text-game-text">{t(locale, '建筑升级成本', 'Build Upgrade Cost', '建築強化コスト')}</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCard label={t(locale, '石质结构', 'Stone Structures', '石構造')} value={buildCost.stone} />
            <SummaryCard label={t(locale, '金属碎片', 'Metal Fragments', '金属片')} value={buildCost.metal} />
            <SummaryCard label={t(locale, '木材', 'Wood', '木材')} value={buildCost.wood} />
          </div>
          <p className="mt-3 text-xs text-game-text-muted">
            {t(locale, '按当前墙体、地基和门数量估算，用于开服第一天规划石质核心区和金属门。', 'Estimated from the current walls, foundations, and doors for day-one stone core and metal door planning.', '現在の壁、土台、扉数から初日の石造コアと金属扉を見積もります。')}
          </p>
        </section>

        <section className="rounded-lg border border-game-border bg-game-surface p-4">
          <h2 className="mb-3 text-lg font-semibold text-game-text">{t(locale, '抄家爆破成本', 'Raid Cost', 'レイドコスト')}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {numberInput(t(locale, '目标石墙', 'Target Stone Walls', '対象石壁'), raidStoneWalls, setRaidStoneWalls)}
            {numberInput(t(locale, '目标金属门', 'Target Metal Doors', '対象金属扉'), raidMetalDoors, setRaidMetalDoors)}
          </div>
          <ResultGrid
            items={[
              [t(locale, '爆炸弹药', 'Explosive Ammo', '爆発弾薬'), raidCost.explosiveAmmo],
              [t(locale, '火箭弹', 'Rockets', 'ロケット'), raidCost.rockets],
              [t(locale, '硫磺预算', 'Sulfur Budget', '硫黄目安'), raidCost.sulfur],
            ]}
          />
        </section>

        <section className="rounded-lg border border-game-border bg-game-surface p-4">
          <h2 className="mb-3 text-lg font-semibold text-game-text">{t(locale, '自动化烧矿收益', 'Automated Smelting', '自動精錬')}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {numberInput(t(locale, '矿石数量', 'Ore', '鉱石'), ore, setOre)}
            {numberInput(t(locale, '熔炉数量', 'Furnaces', '炉数'), furnaces, setFurnaces, 1)}
          </div>
          <ResultGrid
            items={[
              [t(locale, '金属碎片产出', 'Metal Output', '金属片出力'), smelt.metalFragments],
              [t(locale, '木炭副产物', 'Charcoal', '木炭'), smelt.charcoal],
              [t(locale, '预计小时', 'Hours Needed', '必要時間'), smelt.hoursNeeded.toFixed(1)],
            ]}
          />
        </section>
      </div>
    </div>
  );
}

function ResultGrid({ items }: { items: Array<[string, string | number]> }) {
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-3">
      {items.map(([label, value]) => (
        <SummaryCard key={label} label={label} value={value} />
      ))}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-game-border bg-game-surface-alt p-3">
      <div className="text-xs text-game-text-muted">{label}</div>
      <div className="mt-1 text-lg font-bold text-game-primary">{value}</div>
    </div>
  );
}

// =====================================================================
// Genshin Calculator
// =====================================================================


function ComingSoon({ locale }: { locale: SupportedLocale }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="rounded-xl border-2 border-dashed border-game-border p-12 text-center">
        <h2 className="mb-2 text-xl font-semibold text-game-text-muted">{t(locale, '敬请期待', 'Coming Soon', 'Coming Soon')}</h2>
        <p className="text-sm text-game-text-muted">{t(locale, '该游戏的计算器功能正在开发中', 'Calculator for this game is under development', 'このゲームの計算機は開発中です')}</p>
      </div>
    </div>
  );
}
