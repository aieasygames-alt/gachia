import dynamic from 'next/dynamic';
import { GAMES, CATEGORY_LABELS, LOCALES } from '@gachia/core';
import type { GameId, SupportedLocale } from '@gachia/core';

const BASE_URL = 'https://gachia.com';

const CALC_DESC: Record<string, Record<string, string>> = {
  genshin: { zh: '原神角色养成计算器，计算升级、突破所需材料数量，支持材料库存管理', en: 'Genshin Impact character upgrade calculator — compute ascension materials, level-up costs, and track your inventory', ja: '原神キャラ育成計算機、昇格素材・レベルアップ必要数を計算、在庫管理対応' },
  starrail: { zh: '崩坏：星穹铁道角色养成计算器，计算升级、突破所需材料数量', en: 'Honkai: Star Rail character upgrade calculator — compute ascension and trace materials needed', ja: 'スターレイルキャラ育成計算機、昇格素材・軌跡素材の必要数を計算' },
  wuwa: { zh: '鸣潮角色养成计算器，计算升级、突破所需材料数量，支持材料库存管理', en: 'Wuthering Waves character upgrade calculator — compute ascension materials and track your inventory', ja: '鳴潮キャラ育成計算機、昇格素材必要数を計算、在庫管理対応' },
  skjh: { zh: '失控进化资源计算器，估算领地柜维护、石墙金属门升级、抄家爆破和自动化烧矿收益', en: 'Ashfall Evolution resource calculator for territory upkeep, stone wall and metal door upgrades, raid costs, and automated smelting returns', ja: '失控進化の資源計算機。領地維持、石壁・金属扉、レイドコスト、自動精錬を見積もり' },
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
  const gameName = GAMES[gameId]?.name[locale];
  const categoryLabel = CATEGORY_LABELS.calculator?.[locale] ?? 'Calculator';
  const languages: Record<string, string> = {};
  for (const l of LOCALES) {
    const hreflang = l === 'zh' ? 'zh-Hans' : l;
    languages[hreflang] = `${BASE_URL}/${l}/${gameId}/calculator`;
  }
  languages['x-default'] = `${BASE_URL}/zh/${gameId}/calculator`;
  const desc = CALC_DESC[gameId]?.[locale] ?? `${categoryLabel} - ${gameName}`;

  return {
    title: `${categoryLabel} - ${gameName}`,
    description: desc,
    alternates: { canonical: `${BASE_URL}/${locale}/${gameId}/calculator`, languages },
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

  return <CalculatorClient gameId={gameId} locale={locale} />;
}
