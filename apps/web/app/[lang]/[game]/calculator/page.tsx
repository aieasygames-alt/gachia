import dynamic from 'next/dynamic';
import { notFound } from 'next/navigation';
import { GAMES, CATEGORY_LABELS, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';
import { buildLocalizedAlternates } from '@/lib/seo-metadata';
import { loadStarRailCharacterPublication } from '@/components/wiki/starrail-cms-character';
import { StarRailCalculator } from './starrail-calculator-client';
import { STARRAIL_CMS_CHARACTERS } from '@gachia/data/cms/starrail-character';

const BASE_URL = 'https://gachia.com';

const CALC_DESC: Record<string, Record<string, string>> = {
  starrail: { zh: '崩坏：星穹铁道角色养成计算器，计算升级、突破所需材料数量', en: 'Honkai: Star Rail character upgrade calculator — compute ascension and trace materials needed', ja: 'スターレイルキャラ育成計算機、昇格素材・軌跡素材の必要数を計算' },
  wuwa: { zh: '鸣潮角色养成计算器，计算升级、突破所需材料数量，支持材料库存管理', en: 'Wuthering Waves character upgrade calculator — compute ascension materials and track your inventory', ja: '鳴潮キャラ育成計算機、昇格素材必要数を計算、在庫管理対応' },
  zzz: { zh: '绝区零代理人养成计划器，按等级、核心技、技能和音擎目标汇总材料、丁尼、库存缺口与体力刷取顺序。', en: 'Zenless Zone Zero agent planner for level, Core Skill, skills, and W-Engine targets with materials, Denny, inventory gaps, and farming order.', ja: 'ゼンレスゾーンゼロのエージェント育成計画。レベル、コアスキル、スキル、Wエンジン目標ごとの素材、ディニー、在庫不足、周回順を確認。' },
  sea: { zh: '遗忘之海黑券 6 选 1 推荐器与首周资源分配器，按队伍缺口、开荒目标、好金砖、周常打捞和外观预算规划路线。', en: 'Sea of Remnants Black Ticket selector and week-one resource planner for roster gaps, launch focus, Good Gold Bricks, weekly dredging, and outfit budget.', ja: 'Sea of Remnants 黒券6択おすすめと初週リソース配分。編成不足、開荒目標、好金砖、週課、衣装予算を整理します。' },
  skjh: { zh: '失控进化资源计算器，估算领地柜维护、石墙地基、金属门升级、抄家爆破、硫磺预算和自动化烧矿收益，适合开荒、建家和服务器周期规划。', en: 'Ashfall Evolution resource calculator for territory upkeep, stone foundations, metal doors, raid costs, sulfur budget, and automated smelting returns.', ja: '失控進化の資源計算機。領地維持、石壁、金属扉、レイド、硫黄、自動精錬を見積もります。' },
};

const CALC_TITLES: Partial<Record<GameId, Record<SupportedLocale, string>>> = {
  sea: {
    zh: '遗忘之海黑券推荐器｜首周资源、好金砖与开荒规划工具',
    en: 'Sea of Remnants Black Ticket Selector & Week-One Planner',
    ja: 'Sea of Remnants 黒券おすすめ・初週リソース計算',
  },
  skjh: {
    zh: '失控进化资源计算器｜领地柜维护、抄家成本与烧矿收益',
    en: 'Ashfall Evolution Resource Calculator — Upkeep, Raid Cost & Smelting',
    ja: '失控進化 資源計算機｜領地維持・レイド・精錬',
  },
};

const CalculatorClient = dynamic(() => import('./calculator-client').then((m) => m.CalculatorClient));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;
  if (gameId === 'genshin') return { robots: { index: false, follow: false } };
  const gameName = GAMES[gameId]?.name[locale];
  const categoryLabel = CATEGORY_LABELS.calculator?.[locale] ?? 'Calculator';
  const alternates = buildLocalizedAlternates(locale, (lang) => `/${lang}/${gameId}/calculator`, LOCALES);
  const desc = CALC_DESC[gameId]?.[locale] ?? `${categoryLabel} - ${gameName}`;

  return {
    title: CALC_TITLES[gameId]?.[locale] ?? `${categoryLabel} - ${gameName}`,
    description: desc,
    alternates,
  };
}

export default async function CalculatorPage({
  params,
}: {
  params: Promise<{ lang: string; game: string }>;
}) {
  const { lang, game } = await params;
  const locale = lang as SupportedLocale;
  const gameId = game as GameId;

  if (gameId === 'genshin') notFound();
  if (gameId === 'starrail') {
    const docs = await Promise.all((Object.keys(STARRAIL_CMS_CHARACTERS) as (keyof typeof STARRAIL_CMS_CHARACTERS)[]).map(id => loadStarRailCharacterPublication(locale, id)));
    return <StarRailCalculator locale={locale} verifiedCharacters={docs.flatMap(doc => doc?.characterData ? [{ character: doc.characterData, checkedAt: doc.checkedAt }] : [])} />;
  }
  return <CalculatorClient gameId={gameId} locale={locale} />;
}
